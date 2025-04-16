import { Result, Ok, Err } from "ts-results-es";
import type { ExplorerErgoBox } from "../shared/types/ergo.js";

/**
 * Fetches unspent boxes for a given Ergo address
 * @param address The Ergo address to fetch boxes for
 * @returns Promise containing a Result with an array of unspent boxes or an error
 */
export const fetchUnspentBoxes = async (
  address: string
): Promise<Result<ExplorerErgoBox[], Error>> => {
  try {
    const response = await fetch(
      `https://api.ergoplatform.com/api/v1/boxes/unspent/byAddress/${address}`
    );

    if (!response.ok) {
      return Err(new Error(`HTTP error! status: ${response.status}`));
    }

    const data = await response.json();
    return Ok(data.items);
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to fetch unspent boxes")
    );
  }
};

/**
 * Fetches the latest block height from the Ergo blockchain
 * @returns Promise containing a Result with the latest block height or an error
 */
export const fetchLatestBlockHeight = async (): Promise<
  Result<number, Error>
> => {
  try {
    const response = await fetch(
      "https://api.ergoplatform.com/api/v1/blocks?limit=1"
    );

    if (!response.ok) {
      return Err(new Error(`HTTP error! status: ${response.status}`));
    }

    const data = await response.json();
    if (!data.items?.[0]?.height) {
      return Err(new Error("Invalid response format from blockchain explorer"));
    }

    return Ok(data.items[0].height);
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to fetch latest block height")
    );
  }
};
