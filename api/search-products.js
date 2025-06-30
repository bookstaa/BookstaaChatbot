const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== "string" || q.trim().length < 3) {
    return res.status(400).json({ error: "Query too short or missing." });
  }

  const searchTerm = q.trim().toLowerCase();
  const SHOPIFY_API_ENDPOINT = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`;
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_API_TOKEN;

  const query = `
    query {
      products(first: 100, query: "${searchTerm}") {
        edges {
          node {
            id
            title
            handle
            description
            vendor
            tags
            metafields(first: 5) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(SHOPIFY_API_ENDPOINT, {
      method: "POST",
      headers: {
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error("🛑 Shopify GraphQL Error:", result.errors);
      return res.status(500).json({ error: "Shopify API error", details: result.errors });
    }

    const edges = result.data.products.edges;

    const filteredProducts = edges.filter(({ node }) => {
      const title = node.title.toLowerCase();
      const description = (node.description || "").toLowerCase();
      const vendor = (node.vendor || "").toLowerCase();
      const tags = node.tags.map(t => t.toLowerCase());
      const meta = node.metafields.edges.map(e => e.node.value.toLowerCase());

      return (
        title.includes(searchTerm) ||
        vendor.includes(searchTerm) ||
        description.includes(searchTerm) ||
        tags.some(tag => tag.includes(searchTerm)) ||
        meta.some(m => m.includes(searchTerm))
      );
    });

    const products = filteredProducts.slice(0, 10).map(({ node }) => {
      const variant = node.variants.edges[0]?.node;
      const image = node.images.edges[0]?.node;

      return {
        title: node.title,
        author: node.vendor,
        link: `https://www.bookstaa.com/products/${node.handle}`,
        image: image?.url,
        altText: image?.altText || node.title,
        price: variant?.price?.amount,
        currency: variant?.price?.currencyCode,
        tags: node.tags,
      };
    });

    return res.status(200).json({ products });
  } catch (err) {
    console.error("❌ Product search error:", err);
    return res.status(500).json({ error: "Server error during product search" });
  }
};
