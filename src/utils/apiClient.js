const axios = require("axios");
require("dotenv").config();

const apiClient = axios.create({
  baseURL: process.env.API_CATEGORIES_URL,
  params: {
    oauth_consumer_key: process.env.OAUTH_CONSUMER_KEY,
    oauth_token: process.env.OAUTH_TOKEN,
    oauth_signature_method: process.env.OAUTH_SIGNATURE_METHOD,
    oauth_signature: process.env.OAUTH_SIGNATURE,
  },
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const makeRequest = async (method, url, data = null, params = {}) => {
  try {
    const response = await apiClient({
      method,
      url,
      data,
      params: {
        ...apiClient.defaults.params,
        ...params,
      },
    });

    return response.data;
  } catch (error) {
    console.error("API request failed:", error.message);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      throw new Error(
        `API request failed with status ${
          error.response.status
        }: ${JSON.stringify(error.response.data)}`
      );
    }

    throw error;
  }
};

const api = {
  getProducts: (page = 1, limit = 10) => {
    return makeRequest("get", "/products", null, { page, limit, pageinfo: 1 });
  },

  getProductsByCategory: (categoryId) => {
    return makeRequest("get", "/categories", null, {
      category_id: categoryId,
    });
  },

  getProductById: (productId) => {
    return makeRequest("get", `/products/${productId}`);
  },

  getCategories: () => {
    return makeRequest("get", "/categories");
  },

  getCategoryById: (categoryId) => {
    return makeRequest("get", `/category/${categoryId}`);
  },
};

module.exports = api;
