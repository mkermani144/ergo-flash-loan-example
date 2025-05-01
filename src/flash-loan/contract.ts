import { compile } from "@fleet-sdk/compiler";
import { Network } from "@fleet-sdk/core";
import { Result, Ok, Err } from "ts-results-es";

const script = `
{
  if (!(SELF.R4[Coll[Byte]].isDefined) || SELF.tokens.size == 0 || SELF.tokens.size > 2) {
    sigmaProp(false)
  } else {
    // R4 contains the owner's public key
    val ownerPk = SELF.R4[Coll[Byte]].get

    // The NFT is the first token in the box
    val nftId = SELF.tokens(0)._1

    // Helper function to check if a box has the same contract and preserves metadata
    def hasSameContractAndMetadata(box: Box): Boolean = {
      box.propositionBytes == SELF.propositionBytes &&
      box.R4[Coll[Byte]].isDefined &&
      box.R4[Coll[Byte]].get == ownerPk &&
      box.tokens.size >= 1 &&
      box.tokens(0)._1 == nftId
    }

    // Helper function to check ERG return with fee
    def hasValidErgReturn(box: Box): Boolean = {
      SELF.tokens.size == 1 && {
        val minReturn = SELF.value + (SELF.value / 100L)
        box.value >= minReturn
      }
    }

    // Helper function to check token return with fee
    def hasValidTokenReturn(box: Box): Boolean = {
      // Make sure input box has at least 2 tokens (NFT + loan token)
      SELF.tokens.size == 2 && {
        // We know NFT is at index 0, so loan token is at index 1
        val loanToken = SELF.tokens(1)
        val loanTokenId = loanToken._1
        val loanAmount = loanToken._2

        // Make sure output box has at least 2 tokens (NFT + loan token)
        box.tokens.size == 2 && {
          // First token must be the NFT, second token must be the loan token with fee
          val returnToken = box.tokens(1)

          val returnTokenId = returnToken._1
          val returnAmount = returnToken._2

          // The token must be the same and amount must include at least 1% fee
          returnTokenId == loanTokenId &&
          returnAmount >= loanAmount + (loanAmount / 100L)
        }
      }
    }

    // Check all outputs to ensure no tokens/ERG are siphoned off
    val isFlashLoanTx = OUTPUTS.exists({ (box: Box) =>
      hasSameContractAndMetadata(box) && (
        // If this box contains ERG (and no tokens other than the NFT)
        hasValidErgReturn(box) ||
        // If this box contains tokens (other than the NFT)
        hasValidTokenReturn(box)
      )
    })

    // The contract can be spent if either condition is satisfied
    sigmaProp(
      // Either the owner is redeeming it with their signature
      proveDlog(decodePoint(ownerPk)) ||
      // Or it's a valid flash loan transaction
      isFlashLoanTx
    )
  }
}
`;

/**
 * Compiles the flash loan contract
 * @returns Promise containing the compiled contract
 */
export const compileFlashLoanContract = async (): Promise<
  Result<string, Error>
> => {
  try {
    const compileOutput = await compile(script);
    const contractAddress = compileOutput.toAddress(Network.Mainnet).toString();
    return Ok(contractAddress);
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to compile flash loan contract")
    );
  }
};
