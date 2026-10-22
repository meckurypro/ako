// src/types/paystack-inline-js.d.ts
//
// @paystack/inline-js ships no typings. Only the surface FundWallet uses.
declare module "@paystack/inline-js" {
  interface ResumeCallbacks {
    onSuccess?: (transaction: { id: number; reference: string; message: string }) => void;
    onCancel?: () => void;
    onError?: (error: { message: string }) => void;
    onLoad?: (response: unknown) => void;
  }

  export default class PaystackPop {
    constructor();
    resumeTransaction(accessCode: string, callbacks?: ResumeCallbacks): unknown;
  }
}
