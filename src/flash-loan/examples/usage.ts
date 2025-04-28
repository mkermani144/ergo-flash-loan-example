import { Result } from "ts-results-es";
import {
  createFlashLoanTransaction,
  FlashLoanConfig,
} from "../examples/flash.js";
import { initWallet } from "../../blockchain/service.js";
import { SignedTransaction } from "@fleet-sdk/common";
import { SAFE_MIN_BOX_VALUE } from "@fleet-sdk/core";

/**
 * Example of creating and using a flash loan transaction with a mocked flash box
 */
const executeFlashLoanExample = async (): Promise<
  Result<SignedTransaction, Error>
> => {
  console.log("Initializing wallet...");
  // Initialize wallet
  const walletResult = await initWallet();
  if (walletResult.isErr()) {
    console.error("Failed to initialize wallet:", walletResult.error.message);
    return walletResult;
  }
  console.log("Wallet initialized successfully:", walletResult.value.address);

  const loanAmount = SAFE_MIN_BOX_VALUE * 100n; // 100x min box value
  const feePercentage = 1; // 1%
  const feeAmount = (loanAmount * BigInt(feePercentage)) / 100n;

  console.log("Configuring flash loan transaction:");
  console.log(`- Loan amount: ${loanAmount} nanoERGs`);
  console.log(`- Fee percentage: ${feePercentage}%`);
  console.log(`- Fee amount: ${feeAmount} nanoERGs`);

  // Configure flash loan with mocked flash box
  const flashLoanConfig: FlashLoanConfig = {
    wallet: walletResult.value,
    loanAmount,
    feePercentage,
  };

  console.log("Creating flash loan transaction with mocked flash box...");
  // Create flash loan transaction with mocked flash box
  const flashLoanTxResult = await createFlashLoanTransaction(flashLoanConfig);
  if (flashLoanTxResult.isErr()) {
    console.error(
      "Flash loan transaction failed:",
      flashLoanTxResult.error.message
    );
    return flashLoanTxResult;
  }

  const signedTransaction = flashLoanTxResult.value;
  console.log("Flash loan transaction created successfully!");
  console.log(`Transaction ID: ${signedTransaction.id}`);
  console.log(`Transaction inputs: ${signedTransaction.inputs.length}`);
  console.log(`Transaction outputs: ${signedTransaction.outputs.length}`);

  // In a production app, you would submit the transaction
  console.log("Ready to submit transaction to the blockchain");

  return flashLoanTxResult;
};

// Execute the example (uncomment to run)
executeFlashLoanExample().then(result => {
  if (result.isOk()) {
    console.log("Success!");
  } else {
    console.error("Failed:", result.error.message);
  }
});

// export { executeFlashLoanExample };
