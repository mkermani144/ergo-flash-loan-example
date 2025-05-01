import { Result, Ok, Err } from "ts-results-es";
import {
  OutputBuilder,
  SAFE_MIN_BOX_VALUE,
  ErgoAddress,
  SColl,
  SByte,
} from "@fleet-sdk/core";
import { buildTransaction } from "../../blockchain/service.js";
import { compileFlashLoanContract } from "../contract.js";
import { SignedTransaction } from "@fleet-sdk/common";
import { SelectorFriendlyErgoBox } from "../../blockchain/types.js";
import { MockChain, mockUTxO } from "@fleet-sdk/mock-chain";

/**
 * Creates a mock flash loan box for testing
 * @param contractAddress The contract address
 * @param boxErg The box amount in nanoERGs
 * @returns A mocked flash loan box compatible with the transaction builder
 */
const createMockFlashBox = (
  contractAddress: string,
  boxErg: bigint,
  ownerAddress: string
): SelectorFriendlyErgoBox => {
  const { ergoTree } = ErgoAddress.fromBase58(contractAddress);

  return mockUTxO({
    value: boxErg,
    ergoTree,
    assets: [
      {
        tokenId:
          "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489",
        amount: 1n,
      },
    ],
    additionalRegisters: {
      R4: SColl(SByte, ownerAddress).toHex(),
    },
  });
};

/**
 * Creates a flash loan transaction that borrows from a mocked flash loan box and returns it with added fees
 * @param config Transaction configuration
 * @returns Promise containing a Result with the signed transaction or an error
 */
const createFlashLoanTransaction = async (): Promise<
  Result<Boolean, Error>
> => {
  try {
    const mockChain = new MockChain();

    const owner = mockChain.newParty();
    owner.addBalance({ nanoergs: 1000000000n });

    const loanAmount = SAFE_MIN_BOX_VALUE * 10n;

    const flashLoanContractAddressResult = await compileFlashLoanContract();
    if (flashLoanContractAddressResult.isErr()) {
      return Err(flashLoanContractAddressResult.error);
    }
    const flashLoanContractAddress = flashLoanContractAddressResult.value;

    const flashBox = createMockFlashBox(
      flashLoanContractAddress,
      loanAmount,
      Buffer.from(mockChain.newParty().address.getPublicKeys()[0]).toString(
        "hex"
      )
    );

    const flashFee = (flashBox.value * BigInt(1)) / 100n;

    const flashOutputBox = new OutputBuilder(
      flashBox.value + flashFee,
      flashLoanContractAddress
    );

    flashOutputBox.addNfts(flashBox.assets[0].tokenId);
    flashOutputBox.setAdditionalRegisters({
      R4: flashBox.additionalRegisters.R4,
    });

    const unsignedTxResult = await buildTransaction(
      [flashBox, ...owner.utxos],
      [flashOutputBox],
      owner.address.toString(),
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

    return Ok(isValid);
  } catch (error) {
    console.warn(error);
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to create flash loan transaction")
    );
  }
};

const main = async () => {
  const flashResult = await createFlashLoanTransaction();
  if (flashResult.isErr()) {
    console.error("Failed to submit flash loan transaction");
  } else {
    console.warn("Flash loan transaction submitted");
  }
};

main();
