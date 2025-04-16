import { Result, Ok, Err } from "ts-results-es";
import { OutputBuilder, SAFE_MIN_BOX_VALUE } from "@fleet-sdk/core";
import {
  signTransaction,
  selectRequiredBoxes,
  buildTransaction,
} from "../blockchain/service.js";
import { compileFlashLoanContract } from "./contract.js";
import type { InitializedWallet } from "../shared/types/ergo.js";
import { SignedTransaction } from "@fleet-sdk/common";

/**
 * Creates a flash loan transaction
 * @param config Transaction configuration
 * @returns Promise containing a Result with the unsigned transaction or an error
 */
export const createFlashLoanTransaction = async (
  config: InitializedWallet
): Promise<Result<SignedTransaction, Error>> => {
  try {
    // Compile flash loan contract
    const flashLoanContractAddressResult = await compileFlashLoanContract();
    if (flashLoanContractAddressResult.isErr()) {
      return Err(flashLoanContractAddressResult.error);
    }
    const flashLoanContractAddress = flashLoanContractAddressResult.value;

    // Output boxes
    const output = new OutputBuilder(
      SAFE_MIN_BOX_VALUE,
      flashLoanContractAddress
    );

    // Input boxes
    const selectedBoxesResult = await selectRequiredBoxes(
      config.address,
      SAFE_MIN_BOX_VALUE * 2n // min fee + min box value
    );
    if (selectedBoxesResult.isErr()) {
      return Err(selectedBoxesResult.error);
    }
    const selectedBoxes = selectedBoxesResult.value;

    // Build transaction
    const unsignedTxResult = await buildTransaction(
      selectedBoxes,
      [output],
      config.address
    );
    if (unsignedTxResult.isErr()) {
      return Err(unsignedTxResult.error);
    }
    const unsignedTx = unsignedTxResult.value;

    // Sign transaction
    const signedTxResult = await signTransaction(unsignedTx, config);
    if (signedTxResult.isErr()) {
      return Err(signedTxResult.error);
    }

    return Ok(signedTxResult.value);
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to create flash loan transaction")
    );
  }
};
