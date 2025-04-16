import { initWallet } from "./blockchain/service.js";
import { createPoolTransaction } from "./pool/index.js";
import { createFlashLoanTransaction } from "./flash-loan/index.js";

/**
 * Main application entry point
 */
export async function main() {
  try {
    const walletResult = await initWallet();
    if (walletResult.isErr()) {
      console.error("Failed to initialize wallet:", walletResult.error);
      return;
    }

    const wallet = walletResult.value;

    // Create and sign a pool transaction
    const poolTxResult = await createPoolTransaction(wallet);
    if (poolTxResult.isErr()) {
      console.error("Failed to create pool transaction:", poolTxResult.error);
      return;
    }
    console.log("Pool Transaction:", poolTxResult.value);

    // Create and sign a flash loan transaction
    const flashTxResult = await createFlashLoanTransaction(wallet);
    if (flashTxResult.isErr()) {
      console.error(
        "Failed to create flash loan transaction:",
        flashTxResult.error
      );
      return;
    }
    console.log("Flash Loan Transaction:", flashTxResult.value);
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}
