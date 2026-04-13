import { axiosInstance } from "../config/axiosConfig";

/**
 * Payment service for handling subscription plans and Razorpay transactions
 */
export const paymentService = {
  /**
   * Fetch active subscription plans from the superadmin configuration
   * @returns {Promise<Array>}
   */
  getPlans: async () => {
    try {
      const response = await axiosInstance.get("/payments/plans");
      return response.data;
    } catch (error) {
      console.error("Error fetching plans:", error);
      throw error;
    }
  },

  /**
   * Get current subscription status
   * @returns {Promise<Object>}
   */
  getStatus: async () => {
    try {
      const response = await axiosInstance.get("/payments/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching status:", error);
      throw error;
    }
  },

  /**
   * Create a Razorpay order for a selected plan
   * @param {Object} data - { planId, organizationId, candidateId, email }
   * @returns {Promise<Object>}
   */
  createOrder: async (data) => {
    try {
      const response = await axiosInstance.post("/payments/create-order", data);
      return response.data;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },
  
  /**
   * Upgrade a plan (PUT method)
   * @param {Object} data - { planId, organizationId, candidateId, email }
   * @returns {Promise<Object>}
   */
  upgradeOrder: async (data) => {
    try {
      const response = await axiosInstance.put("/payments/create-order", data);
      return response.data;
    } catch (error) {
      console.error("Error upgrading order:", error);
      throw error;
    }
  },

  /**
   * Verify a completed Razorpay payment
   * @param {Object} data - { razorpay_order_id, razorpay_payment_id, razorpay_signature, candidateId }
   * @returns {Promise<Object>}
   */
  verifyPayment: async (data) => {
    try {
      const response = await axiosInstance.post("/payments/verify-payment", data);
      return response.data;
    } catch (error) {
      console.error("Error verifying payment:", error);
      throw error;
    }
  },

  /**
   * Get candidate's payment history
   * @returns {Promise<Array>}
   */
  getHistory: async () => {
    try {
      const response = await axiosInstance.get("/payments/history");
      return response.data;
    } catch (error) {
      console.error("Error fetching payment history:", error);
      throw error;
    }
  },

  /**
   * Get candidate's remaining and allotted credits overview
   * @returns {Promise<Object>}
   */
  getCredits: async () => {
    try {
      const response = await axiosInstance.get("/payments/credits/overview");
      return response.data;
    } catch (error) {
      console.error("Error fetching credits:", error);
      throw error;
    }
  },

  /**
   * Deduct credits for a specific service usage
   * @param {Object} data - { serviceType, serviceName, creditsToDeduct, metadata }
   * @returns {Promise<Object>}
   */
  deductCredits: async (data) => {
    try {
      const response = await axiosInstance.post("/payments/credits/deduct", data);
      return response.data;
    } catch (error) {
      console.error("Error deducting credits:", error);
      throw error;
    }
  }
};
