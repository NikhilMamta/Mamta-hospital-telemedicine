// Razorpay configuration placeholder
export const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

// In the future, you will initialize the Razorpay SDK instance here:
// import Razorpay from 'razorpay';
// export const razorpayInstance = new Razorpay({
//   key_id: razorpayConfig.keyId,
//   key_secret: razorpayConfig.keySecret
// });
