export type SeedCategory = {
  name: string;
  slug: string;
  imageUrl: string;
  products: Array<{
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
    description: string;
    featured?: boolean;
    stock: number;
  }>;
};

export const seedCategories: SeedCategory[] = [
  {
    name: "Hats",
    slug: "hats",
    imageUrl: "https://i.ibb.co/cvpntL1/hats.png",
    products: [
      {
        name: "Brown Brim",
        slug: "brown-brim",
        imageUrl: "https://i.ibb.co/ZYW3VTp/brown-brim.png",
        price: 25,
        description: "Sombrero casual de ala corta para looks urbanos.",
        featured: true,
        stock: 12,
      },
      {
        name: "Blue Beanie",
        slug: "blue-beanie",
        imageUrl: "https://i.ibb.co/ypkgK0X/blue-beanie.png",
        price: 18,
        description: "Beanie tejido para clima frio con fit limpio.",
        stock: 18,
      },
      {
        name: "Brown Cowboy",
        slug: "brown-cowboy",
        imageUrl: "https://i.ibb.co/QdJwgmp/brown-cowboy.png",
        price: 35,
        description: "Cowboy moderno para colecciones de temporada.",
        stock: 8,
      },
      {
        name: "Grey Brim",
        slug: "grey-brim",
        imageUrl: "https://i.ibb.co/RjBLWxB/grey-brim.png",
        price: 25,
        description: "Sombrero gris versatil con terminacion premium.",
        stock: 10,
      }
    ],
  },
  {
    name: "Jackets",
    slug: "jackets",
    imageUrl: "https://i.ibb.co/px2tCc3/jackets.png",
    products: [
      {
        name: "Black Jean Shearling",
        slug: "black-jean-shearling",
        imageUrl: "https://i.ibb.co/XzcwL5s/black-shearling.png",
        price: 125,
        description: "Chaqueta negra con interior suave y look clasico.",
        featured: true,
        stock: 5,
      },
      {
        name: "Blue Jean Jacket",
        slug: "blue-jean-jacket",
        imageUrl: "https://i.ibb.co/mJS6vz0/blue-jean-jacket.png",
        price: 90,
        description: "Denim azul de uso diario con corte moderno.",
        stock: 9,
      },
      {
        name: "Grey Jean Jacket",
        slug: "grey-jean-jacket",
        imageUrl: "https://i.ibb.co/N71k1ML/grey-jean-jacket.png",
        price: 90,
        description: "Versión gris de denim estructurado.",
        stock: 7,
      },
      {
        name: "Brown Shearling",
        slug: "brown-shearling",
        imageUrl: "https://i.ibb.co/s96FpdP/brown-shearling.png",
        price: 165,
        description: "Outerwear de temporada con terminacion premium.",
        stock: 4,
      }
    ],
  },
  {
    name: "Sneakers",
    slug: "sneakers",
    imageUrl: "https://i.ibb.co/0jqHpnp/sneakers.png",
    products: [
      {
        name: "Adidas NMD",
        slug: "adidas-nmd",
        imageUrl: "https://i.ibb.co/0s3pdnc/adidas-nmd.png",
        price: 220,
        description: "Sneaker de alto ticket para coleccion street.",
        featured: true,
        stock: 6,
      },
      {
        name: "Adidas Yeezy",
        slug: "adidas-yeezy",
        imageUrl: "https://i.ibb.co/dJbG1cT/yeezy.png",
        price: 280,
        description: "Modelo iconico para drops controlados.",
        stock: 3,
      },
      {
        name: "Black Converse",
        slug: "black-converse",
        imageUrl: "https://i.ibb.co/bPmVXyP/black-converse.png",
        price: 110,
        description: "Clasico atemporal de rotacion alta.",
        stock: 11,
      },
      {
        name: "Nike White AirForce",
        slug: "nike-white-airforce",
        imageUrl: "https://i.ibb.co/1RcFPk0/white-nike-high-tops.png",
        price: 160,
        description: "Blanco limpio con silueta de alta conversión.",
        stock: 7,
      }
    ],
  },
  {
    name: "Womens",
    slug: "womens",
    imageUrl: "https://i.ibb.co/GCCdy8t/womens.png",
    products: [
      {
        name: "Blue Tanktop",
        slug: "blue-tanktop",
        imageUrl: "https://i.ibb.co/7CQVJNm/blue-tank.png",
        price: 25,
        description: "Basico fresco para coleccion femenina.",
        stock: 15,
      },
      {
        name: "Floral Blouse",
        slug: "floral-blouse",
        imageUrl: "https://i.ibb.co/4W2DGKm/floral-blouse.png",
        price: 20,
        description: "Blusa estampada con salida comercial amplia.",
        featured: true,
        stock: 14,
      },
      {
        name: "Floral Dress",
        slug: "floral-dress",
        imageUrl: "https://i.ibb.co/KV18Ysr/floral-skirt.png",
        price: 80,
        description: "Vestido de temporada para campañas visuales.",
        stock: 8,
      },
      {
        name: "Yellow Track Suit",
        slug: "yellow-track-suit",
        imageUrl: "https://i.ibb.co/v1cvwNf/yellow-track-suit.png",
        price: 135,
        description: "Set deportivo de color fuerte para editorial.",
        stock: 6,
      }
    ],
  },
  {
    name: "Mens",
    slug: "mens",
    imageUrl: "https://i.ibb.co/R70vBrQ/men.png",
    products: [
      {
        name: "Camo Down Vest",
        slug: "camo-down-vest",
        imageUrl: "https://i.ibb.co/xJS0T3Y/camo-vest.png",
        price: 325,
        description: "Chaleco premium para ticket alto.",
        stock: 3,
      },
      {
        name: "Floral T-shirt",
        slug: "floral-t-shirt",
        imageUrl: "https://i.ibb.co/qMQ75QZ/floral-shirt.png",
        price: 20,
        description: "T-shirt impresa de venta recurrente.",
        stock: 20,
      },
      {
        name: "Black & White Longsleeve",
        slug: "black-white-longsleeve",
        imageUrl: "https://i.ibb.co/55z32tw/long-sleeve.png",
        price: 25,
        description: "Longsleeve basico con rotacion estable.",
        featured: true,
        stock: 16,
      },
      {
        name: "Jean Long Sleeve",
        slug: "jean-long-sleeve",
        imageUrl: "https://i.ibb.co/VpW4x5t/roll-up-jean-shirt.png",
        price: 40,
        description: "Camisa denim para venta continua.",
        stock: 9,
      }
    ],
  },
];
