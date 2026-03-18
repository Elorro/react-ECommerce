import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canTransitionOrderStatus } from "@/lib/order-status";
import { getPendingPaymentExpiryDate, shouldExpirePendingOrder } from "@/lib/orders-lifecycle";
import { getPagination } from "@/lib/pagination";
import { getAppUrl, getStripe, isStripeMockEnabled } from "@/lib/payments";
import type { OrderCheckoutPayload } from "@/lib/validators/order";

function serializeOrder(order: {
  id: string;
  status: string;
  paymentStatus: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: string;
  subtotalAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  items: Array<{
    id: string;
    quantity: number;
    lineTotal: Prisma.Decimal;
    product: { name: string };
  }>;
}) {
  return {
    ...order,
    subtotalAmount: Number(order.subtotalAmount),
    totalAmount: Number(order.totalAmount),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      productName: item.product.name,
      lineTotal: Number(item.lineTotal),
    })),
  };
}

function getMockStripeSessionId(orderId: string) {
  return `mock_checkout_${orderId}`;
}

function isMockStripeSession(sessionId: string) {
  return isStripeMockEnabled() && sessionId.startsWith("mock_checkout_");
}

async function finalizePaidOrder(order: {
  id: string;
  userId?: string | null;
  items: Array<{
    quantity: number;
    productId: string;
  }>;
}) {
  return db.$transaction(async (tx) => {
    for (const item of order.items) {
      const current = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!current || current.stock < item.quantity) {
        throw new Error("Unable to finalize payment due to stock mismatch.");
      }

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentStatus: "PAID",
        paymentExpiresAt: null,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (order.userId) {
      const cart = await tx.cart.findUnique({
        where: {
          userId: order.userId,
        },
        select: {
          id: true,
        },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });
      }
    }

    return updatedOrder;
  });
}

async function buildValidatedOrder(payload: OrderCheckoutPayload) {
  const products = await db.product.findMany({
    where: {
      id: {
        in: payload.items.map((item) => item.productId),
      },
      status: "ACTIVE",
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  const normalizedItems = payload.items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new Error("Product not found.");
    }

    if (product.stock < item.quantity) {
      throw new Error("Insufficient stock.");
    }

    const unitPrice = Number(product.price);
    return {
      product,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const subtotalAmount = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    normalizedItems,
    subtotalAmount,
    totalAmount: subtotalAmount,
  };
}

export async function createOrder(
  payload: OrderCheckoutPayload,
  context: { userId: string; userEmail: string },
) {
  const { normalizedItems, subtotalAmount, totalAmount } = await buildValidatedOrder(payload);

  return db.$transaction(async (tx) => {
    for (const item of normalizedItems) {
      await tx.product.update({
        where: { id: item.product.id },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    const order = await tx.order.create({
      data: {
        userId: context.userId,
        status: "PAID",
        paymentStatus: "PAID",
        customerName: payload.customerName,
        customerEmail: context.userEmail,
        shippingAddress: payload.shippingAddress,
        subtotalAmount: new Prisma.Decimal(subtotalAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        items: {
          create: normalizedItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            lineTotal: new Prisma.Decimal(item.lineTotal),
          })),
        },
      },
    });

    const cart = await tx.cart.findUnique({
      where: {
        userId: context.userId,
      },
      select: {
        id: true,
      },
    });

    if (cart) {
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });
    }

    return order;
  });
}

export async function createPendingStripeOrder(
  payload: OrderCheckoutPayload,
  context: { userId: string; userEmail: string; userName?: string | null },
) {
  const { normalizedItems, subtotalAmount, totalAmount } = await buildValidatedOrder(payload);

  const order = await db.order.create({
    data: {
      userId: context.userId,
      customerName: payload.customerName || context.userName || "Customer",
      customerEmail: context.userEmail,
      shippingAddress: payload.shippingAddress,
      subtotalAmount: new Prisma.Decimal(subtotalAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
      paymentStatus: "REQUIRES_ACTION",
      paymentProvider: "stripe",
      paymentExpiresAt: getPendingPaymentExpiryDate(),
      items: {
        create: normalizedItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lineTotal: new Prisma.Decimal(item.lineTotal),
        })),
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const baseUrl = getAppUrl();
  const session = isStripeMockEnabled()
    ? {
        id: getMockStripeSessionId(order.id),
        url: `${baseUrl}/checkout/success?session_id=${getMockStripeSessionId(order.id)}&order_id=${order.id}`,
      }
    : await getStripe().checkout.sessions.create({
        mode: "payment",
        customer_email: context.userEmail,
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancel_url: `${baseUrl}/checkout?payment=cancelled`,
        metadata: {
          orderId: order.id,
          userId: context.userId,
        },
        line_items: order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: Math.round(Number(item.unitPrice) * 100),
            product_data: {
              name: item.product.name,
            },
          },
        })),
      });

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentSessionId: session.id,
    },
  });

  return {
    orderId: order.id,
    checkoutUrl: session.url,
  };
}

export async function confirmStripeOrderPayment(params: {
  orderId: string;
  sessionId: string;
  userId: string;
}) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order || order.userId !== params.userId || order.paymentSessionId !== params.sessionId) {
    return null;
  }

  if (order.paymentStatus === "PAID") {
    return serializeOrder(order);
  }

  if (
    shouldExpirePendingOrder({
      paymentStatus: order.paymentStatus,
      paymentExpiresAt: order.paymentExpiresAt,
    })
  ) {
    const expired = await db.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELED",
        paymentStatus: "FAILED",
        canceledAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return serializeOrder(expired);
  }

  if (!isMockStripeSession(params.sessionId)) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(params.sessionId);

    if (session.payment_status !== "paid") {
      return serializeOrder(order);
    }
  }

  const finalized = await finalizePaidOrder(order);
  return serializeOrder(finalized);
}

export async function confirmStripeOrderPaymentBySessionId(sessionId: string) {
  const order = await db.order.findFirst({
    where: {
      paymentSessionId: sessionId,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  if (order.paymentStatus === "PAID") {
    return serializeOrder(order);
  }

  if (
    shouldExpirePendingOrder({
      paymentStatus: order.paymentStatus,
      paymentExpiresAt: order.paymentExpiresAt,
    })
  ) {
    const expired = await db.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELED",
        paymentStatus: "FAILED",
        canceledAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return serializeOrder(expired);
  }

  if (!isMockStripeSession(sessionId)) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return serializeOrder(order);
    }
  }

  const finalized = await finalizePaidOrder(order);

  return serializeOrder(finalized);
}

export async function getOrderById(
  id: string,
  viewerUserId: string,
  viewerRole: "CUSTOMER" | "OPERATIONS" | "ADMIN",
) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  if (viewerRole === "CUSTOMER" && order.userId !== viewerUserId) {
    return null;
  }

  return {
    ...order,
    subtotalAmount: Number(order.subtotalAmount),
    totalAmount: Number(order.totalAmount),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      productName: item.product.name,
      lineTotal: Number(item.lineTotal),
    })),
  };
}

export async function getOrderTimeline(orderId: string) {
  const [order, events] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        createdAt: true,
        paymentStatus: true,
        paymentExpiresAt: true,
        fulfilledAt: true,
        canceledAt: true,
      },
    }),
    db.operationalLog.findMany({
      where: {
        orderId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        level: true,
        scope: true,
        message: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  if (!order) {
    return [];
  }

  type OrderTimelineEvent = {
    id: string;
    tone: "info" | "warn" | "success" | "error";
    title: string;
    description: string;
    createdAt: string;
    metadata: unknown;
  };
  const getTimelineTone = (level: "INFO" | "WARN" | "ERROR"): OrderTimelineEvent["tone"] => {
    if (level === "ERROR") {
      return "error";
    }

    if (level === "WARN") {
      return "warn";
    }

    return "info";
  };

  const timeline: OrderTimelineEvent[] = [
    {
      id: `${order.id}:created`,
      tone: "info",
      title: "Orden creada",
      description: "La orden fue persistida y validada en servidor.",
      createdAt: order.createdAt.toISOString(),
      metadata: null,
    },
  ];

  if (order.paymentStatus === "REQUIRES_ACTION" && order.paymentExpiresAt) {
    timeline.push({
      id: `${order.id}:payment_window`,
      tone: "warn",
      title: "Pago pendiente",
      description: "La orden quedó esperando confirmación de pago.",
      createdAt: order.paymentExpiresAt.toISOString(),
      metadata: {
        paymentStatus: order.paymentStatus,
      },
    });
  }

  if (order.fulfilledAt) {
    timeline.push({
      id: `${order.id}:fulfilled`,
      tone: "success",
      title: "Orden fulfilled",
      description: "La operación marcó la orden como completada.",
      createdAt: order.fulfilledAt.toISOString(),
      metadata: null,
    });
  }

  if (order.canceledAt) {
    timeline.push({
      id: `${order.id}:canceled`,
      tone: "error",
      title: "Orden cancelada",
      description: "La orden fue cancelada o expirada.",
      createdAt: order.canceledAt.toISOString(),
      metadata: {
        paymentStatus: order.paymentStatus,
      },
    });
  }

  timeline.push(
    ...events.map((event) => ({
      id: event.id,
      tone: getTimelineTone(event.level),
      title: event.scope,
      description: event.message,
      createdAt: event.createdAt.toISOString(),
      metadata: event.metadata,
    })),
  );

  timeline.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return timeline;
}

export async function getOrderSupportNotes(orderId: string) {
  const notes = await db.orderNote.findMany({
    where: { orderId },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return notes.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    author: {
      id: note.author.id,
      name: note.author.name,
      email: note.author.email,
      role: note.author.role,
    },
  }));
}

export async function addOrderSupportNote(params: {
  orderId: string;
  authorUserId: string;
  content: string;
}) {
  const note = await db.orderNote.create({
    data: {
      orderId: params.orderId,
      authorUserId: params.authorUserId,
      content: params.content,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return {
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    author: {
      id: note.author.id,
      name: note.author.name,
      email: note.author.email,
      role: note.author.role,
    },
  };
}

export async function getOrdersByUserId(userId: string) {
  const orders = await db.order.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map((order) => ({
    id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount),
    }));
}

export async function getAdminOrders(filters: {
  page: number;
  q?: string;
  status?: "PENDING" | "PAID" | "FULFILLED" | "CANCELED";
  paymentStatus?: "UNPAID" | "REQUIRES_ACTION" | "PAID" | "FAILED";
}) {
  const query = filters.q?.trim();
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(query
      ? {
          OR: [
            { customerName: { contains: query } },
            { customerEmail: { contains: query } },
            { id: { contains: query } },
          ],
        }
      : {}),
  };
  const totalItems = await db.order.count({ where });
  const { currentPage, totalPages, skip, take } = getPagination({
    page: filters.page,
    pageSize: 10,
    totalItems,
  });
  const orders = await db.order.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take,
    include: {
      items: {
        select: {
          quantity: true,
        },
      },
    },
  });

  return {
    items: orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentExpiresAt: order.paymentExpiresAt?.toISOString() ?? null,
      totalAmount: Number(order.totalAmount),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt.toISOString(),
    })),
    totalItems,
    currentPage,
    totalPages,
  };
}

export async function updateOrderStatus(
  orderId: string,
  status: "PENDING" | "PAID" | "FULFILLED" | "CANCELED",
) {
  const current = await db.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      fulfilledAt: true,
      canceledAt: true,
    },
  });

  if (!current) {
    throw new Error("Order not found.");
  }

  if (
    !canTransitionOrderStatus({
      currentStatus: current.status,
      paymentStatus: current.paymentStatus,
      nextStatus: status,
    })
  ) {
    throw new Error("Invalid order status transition.");
  }

  if (current.status === status) {
    return current;
  }

  return db.order.update({
    where: {
      id: orderId,
    },
    data: {
      status,
      paymentStatus:
        status === "PAID" || status === "FULFILLED"
          ? "PAID"
          : status === "CANCELED" && current.paymentStatus !== "PAID"
            ? "FAILED"
            : current.paymentStatus,
      fulfilledAt: status === "FULFILLED" ? new Date() : null,
      canceledAt: status === "CANCELED" ? new Date() : null,
      paymentExpiresAt:
        status === "CANCELED" || status === "PAID" || status === "FULFILLED" ? null : undefined,
    },
  });
}

export async function bulkUpdateOrderStatuses(
  orderIds: string[],
  status: "PAID" | "FULFILLED" | "CANCELED",
) {
  const orders = await db.order.findMany({
    where: {
      id: {
        in: orderIds,
      },
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
    },
  });

  const updatable = orders.filter((order) =>
    canTransitionOrderStatus({
      currentStatus: order.status,
      paymentStatus: order.paymentStatus,
      nextStatus: status,
    }),
  );
  const skippedIds = orderIds.filter((orderId) => !updatable.some((order) => order.id === orderId));

  await db.$transaction(
    updatable.map((order) =>
      db.order.update({
        where: {
          id: order.id,
        },
        data: {
          status,
          paymentStatus:
            status === "PAID" || status === "FULFILLED"
              ? "PAID"
              : order.paymentStatus !== "PAID"
                ? "FAILED"
                : order.paymentStatus,
          fulfilledAt: status === "FULFILLED" ? new Date() : null,
          canceledAt: status === "CANCELED" ? new Date() : null,
          paymentExpiresAt: status === "CANCELED" || status === "PAID" || status === "FULFILLED" ? null : undefined,
        },
      }),
    ),
  );

  return {
    updatedIds: updatable.map((order) => order.id),
    skippedIds,
  };
}

export async function expireStalePendingOrders(now = new Date()) {
  const candidates = await db.order.findMany({
    where: {
      paymentStatus: "REQUIRES_ACTION",
      paymentExpiresAt: {
        lte: now,
      },
    },
    select: {
      id: true,
    },
  });

  if (!candidates.length) {
    return { expiredCount: 0 };
  }

  const result = await db.order.updateMany({
    where: {
      id: {
        in: candidates.map((order) => order.id),
      },
    },
    data: {
      status: "CANCELED",
      paymentStatus: "FAILED",
      canceledAt: now,
    },
  });

  return { expiredCount: result.count };
}

export async function getAdminOrderMetrics() {
  const [
    totalOrders,
    pendingOrders,
    paidOrders,
    fulfilledOrders,
    failedPayments,
    requiresActionOrders,
    canceledOrders,
    revenue,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({
      where: {
        status: "PENDING",
      },
    }),
    db.order.count({
      where: {
        paymentStatus: "PAID",
      },
    }),
    db.order.count({
      where: {
        status: "FULFILLED",
      },
    }),
    db.order.count({
      where: {
        paymentStatus: "FAILED",
      },
    }),
    db.order.count({
      where: {
        paymentStatus: "REQUIRES_ACTION",
      },
    }),
    db.order.count({
      where: {
        status: "CANCELED",
      },
    }),
    db.order.aggregate({
      where: {
        paymentStatus: "PAID",
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    paidOrders,
    fulfilledOrders,
    failedPayments,
    requiresActionOrders,
    canceledOrders,
    paidRevenue: Number(revenue._sum.totalAmount ?? 0),
  };
}
