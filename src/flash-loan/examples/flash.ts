import { Result, Ok, Err } from "ts-results-es";
import {
  OutputBuilder,
  SAFE_MIN_BOX_VALUE,
  ErgoAddress,
} from "@fleet-sdk/core";
import { buildTransaction } from "../../blockchain/service.js";
import { compileFlashLoanContract } from "../contract.js";
import type { InitializedWallet } from "../../shared/types/ergo.js";
import { SignedTransaction } from "@fleet-sdk/common";
import { SelectorFriendlyErgoBox } from "../../blockchain/types.js";
import { MockChain, mockUTxO } from "@fleet-sdk/mock-chain";

/**
 * Configuration for flash loan transactions
 */
export interface FlashLoanConfig {
  /** The initialized wallet for transaction signing */
  wallet: InitializedWallet;
  /** The flash loan amount in nanoERGs */
  loanAmount?: bigint;
  /** Fee percentage (default 1%) */
  feePercentage?: number;
  /** Optional NFT ID for the flash loan box */
  nftId?: string;
}

/**
 * Creates a mock flash loan box for testing
 * @param contractAddress The contract address
 * @param loanAmount The loan amount in nanoERGs
 * @param nftId Optional NFT ID
 * @returns A mocked flash loan box compatible with the transaction builder
 */
const createMockFlashBox = (
  contractAddress: string,
  loanAmount: bigint,
  nftId: string = "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489",
  ownerAddress: string
): SelectorFriendlyErgoBox => {
  const { ergoTree } = ErgoAddress.fromBase58(contractAddress);

  return mockUTxO({
    value: loanAmount,
    creationHeight: 2,
    // index: 1,
    // transactionId: "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489",
    ergoTree,
    assets: [
      {
        tokenId: nftId,
        amount: 1n,
      },
    ],
    additionalRegisters: {
      R4: ownerAddress,
    },
  });
};

/**
 * Creates a flash loan transaction that borrows from a mocked flash loan box and returns it with added fees
 * @param config Transaction configuration
 * @returns Promise containing a Result with the signed transaction or an error
 */
export const createFlashLoanTransaction = async (
  config: FlashLoanConfig
): Promise<Result<SignedTransaction, Error>> => {
  try {
    const mockChain = new MockChain({ height: 1000000 });

    const owner = mockChain.newParty();
    owner.addBalance({ nanoergs: 1000000000n });

    const loanAmount = config.loanAmount ?? SAFE_MIN_BOX_VALUE * 10n; // Default loan amount

    // Compile flash loan contract
    const flashLoanContractAddressResult = await compileFlashLoanContract();
    if (flashLoanContractAddressResult.isErr()) {
      return Err(flashLoanContractAddressResult.error);
    }
    const flashLoanContractAddress = flashLoanContractAddressResult.value;

    // Create a mock flash loan box
    const flashBox = createMockFlashBox(
      flashLoanContractAddress,
      loanAmount,
      config.nftId,
      Buffer.from(mockChain.newParty().address.getPublicKeys()[0]).toString(
        "hex"
      )
    );

    // Calculate fee based on the borrowed amount
    const fee = (flashBox.value * BigInt(1)) / 100n;

    // Create output box that returns the flash loan with fee
    const flashOutputBox = new OutputBuilder(
      flashBox.value + fee, // Return flash box value plus fee
      flashLoanContractAddress
    );

    flashOutputBox.addNfts(flashBox.assets[0].tokenId);
    flashOutputBox.setAdditionalRegisters({
      R4: flashBox.additionalRegisters.R4,
    });

    // Build transaction with both flash box and user boxes as inputs
    const unsignedTxResult = await buildTransaction(
      [flashBox, ...owner.utxos],
      [flashOutputBox], // The flash box is returned with fee
      owner.address.toString(), // Change goes to the user's wallet
      mockChain.height
    );
    if (unsignedTxResult.isErr()) {
      return Err(
        new Error(
          `Failed to build transaction: ${unsignedTxResult.error.message}`
        )
      );
    }
    const unsignedTx = unsignedTxResult.value;

    const isValid = mockChain.execute(unsignedTx, {
      log: true,
      signers: [owner],
    });

    return Ok(unsignedTx as any);
  } catch (error) {
    console.warn(error);
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to create flash loan transaction")
    );
  }
};
