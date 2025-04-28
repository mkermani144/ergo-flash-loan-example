import { Result, Ok, Err } from "ts-results-es";
import { InitializedWallet } from "../shared/types/ergo.js";
import { getMnemonic, deriveHdKey, getAddressFromHdKey } from "./utils.js";
import { Prover } from "@fleet-sdk/wallet";
import {
  ErgoUnsignedTransaction,
  CherryPickSelectionStrategy,
  OutputBuilder,
  TransactionBuilder,
  InsufficientInputs,
  DuplicateInputSelectionError,
} from "@fleet-sdk/core";
import { SignedTransaction } from "@fleet-sdk/common";
import { toSelectorFriendlyErgoBox } from "./utils.js";
import { fetchUnspentBoxes, fetchLatestBlockHeight } from "./api.js";
import { SelectorFriendlyErgoBox } from "./types.js";

// Re-export API functions
export { fetchUnspentBoxes } from "./api.js";

/**
 * Selects unspent boxes that meet the required nanoErgs amount
 * @param address The address to fetch boxes from
 * @param requiredNanoErgs The minimum amount of nanoErgs needed
 * @returns Promise containing a Result with the selected boxes or an error
 */
export const selectRequiredBoxes = async (
  address: string,
  requiredNanoErgs: bigint
): Promise<Result<SelectorFriendlyErgoBox[], Error>> => {
  const boxesResult = await fetchUnspentBoxes(address);
  if (boxesResult.isErr()) {
    return Err(boxesResult.error);
  }

  const boxes = boxesResult.value.map(toSelectorFriendlyErgoBox);
  const boxSelector = new CherryPickSelectionStrategy();
  try {
    const selectedBoxes = boxSelector.select(boxes, {
      nanoErgs: requiredNanoErgs,
    });
    return Ok(selectedBoxes);
  } catch (error) {
    if (error instanceof InsufficientInputs) {
      return Err(new Error(`Insufficient funds: ${error.message}`));
    } else if (error instanceof DuplicateInputSelectionError) {
      return Err(new Error("Duplicate box selection error"));
    }
    return Err(
      error instanceof Error
        ? error
        : new Error("Unexpected error during box selection")
    );
  }
};

/**
 * Initializes the wallet
 * @returns Promise containing a Result with the transaction config or an error
 */
export const initWallet = async (): Promise<
  Result<InitializedWallet, Error>
> => {
  const mnemonicResult = getMnemonic();
  if (mnemonicResult.isErr()) {
    return Err(mnemonicResult.error);
  }

  const mnemonic = mnemonicResult.value;

  const hdKeyResult = await deriveHdKey(mnemonic);
  if (hdKeyResult.isErr()) {
    return Err(hdKeyResult.error);
  }

  const addressResult = getAddressFromHdKey(hdKeyResult.value);
  if (addressResult.isErr()) {
    return Err(addressResult.error);
  }

  return Ok({
    address: addressResult.value,
    hdKey: hdKeyResult.value,
  });
};

/**
 * Signs an unsigned transaction with the wallet's HD key
 * @param unsignedTx The unsigned transaction to sign
 * @param wallet The initialized wallet with HD key
 * @returns Promise containing a Result with the signed transaction or an error
 */
export const signTransaction = async (
  unsignedTx: ErgoUnsignedTransaction,
  wallet: InitializedWallet
): Promise<Result<SignedTransaction, Error>> => {
  try {
    const prover = new Prover();
    const signedTx = await prover.signTransaction(unsignedTx, [wallet.hdKey]);
    return Ok(signedTx);
  } catch (error) {
    return Err(
      error instanceof Error ? error : new Error("Failed to sign transaction")
    );
  }
};

/**
 * Builds a transaction with the given inputs and outputs
 * @param fromBoxes Input boxes for the transaction
 * @param toOutputs Output boxes for the transaction
 * @param changeAddress Address to send change to
 * @returns Promise containing a Result with the unsigned transaction or an error
 */
export const buildTransaction = async (
  fromBoxes: ReturnType<typeof toSelectorFriendlyErgoBox>[],
  toOutputs: OutputBuilder[],
  changeAddress: string,
  height: number
): Promise<Result<ErgoUnsignedTransaction, Error>> => {
  try {
    const unsignedTx = new TransactionBuilder(height)
      .from(fromBoxes)
      .to(toOutputs)
      .payMinFee()
      .sendChangeTo(changeAddress)
      .build();

    return Ok(unsignedTx);
  } catch (error) {
    return Err(
      error instanceof Error ? error : new Error("Failed to build transaction")
    );
  }
};
