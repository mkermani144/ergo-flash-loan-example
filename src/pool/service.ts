import { Result, Ok, Err } from "ts-results-es";
import { OutputBuilder, SAFE_MIN_BOX_VALUE } from "@fleet-sdk/core";
import {
  signTransaction,
  selectRequiredBoxes,
  buildTransaction,
} from "../blockchain/service.js";
import { compilePoolContract } from "./contract.js";
import type { InitializedWallet } from "../shared/types/ergo.js";
import { SignedTransaction } from "@fleet-sdk/common";

/**
 * Creates a pool transaction
 * @param config Transaction configuration
 * @returns Promise containing a Result with the signed transaction or an error
 */
export const createPoolTransaction = async (
  config: InitializedWallet
): Promise<Result<SignedTransaction, Error>> => {
  try {
    // Compile pool contract
    const poolContractAddressResult = await compilePoolContract();
    if (poolContractAddressResult.isErr()) {
      return Err(poolContractAddressResult.error);
    }
    const poolContractAddress = poolContractAddressResult.value;

    // Output boxes
    const output = new OutputBuilder(SAFE_MIN_BOX_VALUE, poolContractAddress);

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
        : new Error("Failed to create pool transaction")
    );
  }
};
