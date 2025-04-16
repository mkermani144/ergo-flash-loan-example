import type { SelectorFriendlyErgoBox } from "./types.js";
import type { ExplorerErgoBox } from "../shared/types/ergo.js";

import { Result, Ok, Err } from "ts-results-es";
import { ERGO_CHANGE_PATH, ErgoHDKey } from "@fleet-sdk/wallet";
import * as dotenv from "dotenv";
import { Network } from "@fleet-sdk/common";

dotenv.config();

/**
 * Converts API ErgoBox to SelectorFriendlyErgoBox
 * @param box The ErgoBox to convert
 * @returns SelectorFriendlyErgoBox
 */
export const toSelectorFriendlyErgoBox = (
  box: ExplorerErgoBox
): SelectorFriendlyErgoBox => ({
  boxId: box.boxId,
  value: BigInt(box.value),
  ergoTree: box.ergoTree,
  creationHeight: box.creationHeight,
  assets: box.assets.map((asset) => ({
    tokenId: asset.tokenId,
    amount: BigInt(asset.amount),
  })),
  additionalRegisters: box.additionalRegisters,
  transactionId: box.transactionId,
  index: box.index,
});

/**
 * Reads the wallet mnemonic from environment variables
 * @returns Result containing the mnemonic or an error
 */
export const getMnemonic = (): Result<string, Error> => {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    return Err(new Error("MNEMONIC environment variable is not set"));
  }

  return Ok(mnemonic);
};

/**
 * Derives an Ergo HD key from a mnemonic
 * @param mnemonic The wallet mnemonic phrase
 * @returns Promise containing a Result with the derived HD key or an error
 */
export const deriveHdKey = async (
  mnemonic: string
): Promise<Result<ErgoHDKey, Error>> => {
  try {
    const hdKey = await ErgoHDKey.fromMnemonic(mnemonic, {
      path: ERGO_CHANGE_PATH + "/0",
    });
    return Ok(hdKey);
  } catch (error) {
    return Err(
      error instanceof Error ? error : new Error("Failed to derive HD key")
    );
  }
};

/**
 * Gets an Ergo address from an HD key
 * @param hdKey The Ergo HD key
 * @returns Result with the address as string or an error
 */
export const getAddressFromHdKey = (
  hdKey: ErgoHDKey
): Result<string, Error> => {
  try {
    return Ok(hdKey.address.toString(Network.Mainnet));
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to get address from HD key")
    );
  }
};
