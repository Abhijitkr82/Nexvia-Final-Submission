
require('dotenv').config();

const mongoose = require('mongoose');
const Product = require('../models/Product');
const elasticClient = require('../config/elasticsearch');

const INDEX = process.env.ELASTICSEARCH_INDEX || 'products';

async function syncProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
    });

    console.log('MongoDB connected');

    const products = await Product.find().lean();

    console.log(`Found ${products.length} products in MongoDB`);

    await elasticClient.indices.create(
      {
        index: INDEX,
        mappings: {
          properties: {
            title: { type: 'text' },
            description: { type: 'text' },
            category: { type: 'keyword' },
            price: { type: 'double' },
            stock: { type: 'integer' },
            images: { type: 'keyword' },
            vendor: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
      { ignore: [400] }
    );

    if (products.length === 0) {
      console.log('No products found. Nothing to sync.');
      return;
    }

    const operations = products.flatMap((product) => [
      {
        index: {
          _index: INDEX,
          _id: product._id.toString(),
        },
      },
      {
        title: product.title,
        description: product.description,
        category: product.category,
        price: product.price,
        stock: product.stock,
        images: product.images || [],
        vendor: product.vendor?.toString(),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    ]);

    const result = await elasticClient.bulk({
      operations,
      refresh: true,
    });

    if (result.errors) {
      const failed = result.items.filter(
        (item) => item.index?.error
      );

      console.error(`Bulk indexing failed for ${failed.length} products`);

      failed.forEach((item) => {
        console.error(item.index.error);
      });

      throw new Error('Some products could not be indexed');
    }

    const countResult = await elasticClient.count({
      index: INDEX,
    });

    console.log('Product sync completed successfully');
    console.log(`Products indexed: ${result.items.length}`);
    console.log(`Total documents in Elasticsearch: ${countResult.count}`);
  } catch (error) {
    console.error('Product sync failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    await elasticClient.close().catch(() => {});

    console.log('Connections closed');
  }
}

syncProducts();
