/**
 * Utility functions for Razorpay integration
 */

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const getRazorpayOptions = ({ orderId, key, amount, email, name, description, onSuccess, onDismiss }) => {
  return {
    key: key,
    amount: amount,
    currency: "INR",
    name: name || "KareerGrowth",
    description: description || "Subscription Plan",
    order_id: orderId,
    prefill: {
      email: email,
    },
    theme: {
      color: "#2563eb", // blue-600
    },
    handler: function (response) {
      onSuccess(response);
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
  };
};
