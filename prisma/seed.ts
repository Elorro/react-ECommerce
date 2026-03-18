import { PrismaClient } from "@prisma/client";
import { seedCategories } from "../lib/shop-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  for (const category of seedCategories) {
    await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        products: {
          create: category.products.map((product) => ({
            name: product.name,
            slug: product.slug,
            imageUrl: product.imageUrl,
            price: product.price,
            description: product.description,
            featured: product.featured ?? false,
            stock: product.stock,
          })),
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to seed database", error);
    await prisma.$disconnect();
    process.exit(1);
  });
