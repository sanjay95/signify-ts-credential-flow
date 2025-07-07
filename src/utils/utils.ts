import {
  randomPasscode,
  ready,
  SignifyClient,
  Tier,
  CreateIdentiferArgs,
  State,
  Operation,
  Contact,
  Salter,
  Serder,
} from "signify-ts";

class Ansi {
  // Text Colors
  static readonly BLACK = "\x1b[30m";
  static readonly RED = "\x1b[31m";
  static readonly GREEN = "\x1b[32m";
  static readonly YELLOW = "\x1b[33m";
  static readonly BLUE = "\x1b[34m";
  static readonly MAGENTA = "\x1b[35m";
  static readonly CYAN = "\x1b[36m";
  static readonly WHITE = "\x1b[37m";

  // Bright/Light versions
  static readonly BRIGHT_BLACK = "\x1b[90m";
  static readonly BRIGHT_RED = "\x1b[91m";
  static readonly BRIGHT_GREEN = "\x1b[92m";
  static readonly BRIGHT_YELLOW = "\x1b[93m";
  static readonly BRIGHT_BLUE = "\x1b[94m";
  static readonly BRIGHT_MAGENTA = "\x1b[95m";
  static readonly BRIGHT_CYAN = "\x1b[96m";
  static readonly BRIGHT_WHITE = "\x1b[97m";

  // Background colors
  static readonly BG_BLACK = "\x1b[40m";
  static readonly BG_RED = "\x1b[41m";
  static readonly BG_GREEN = "\x1b[42m";
  static readonly BG_YELLOW = "\x1b[43m";
  static readonly BG_BLUE = "\x1b[44m";
  static readonly BG_MAGENTA = "\x1b[45m";
  static readonly BG_CYAN = "\x1b[46m";
  static readonly BG_WHITE = "\x1b[47m";

  // Bright Background colors
  static readonly BG_BRIGHT_BLACK = "\x1b[100m";
  static readonly BG_BRIGHT_RED = "\x1b[101m";
  static readonly BG_BRIGHT_GREEN = "\x1b[102m";
  static readonly BG_BRIGHT_YELLOW = "\x1b[103m";
  static readonly BG_BRIGHT_BLUE = "\x1b[104m";
  static readonly BG_BRIGHT_MAGENTA = "\x1b[105m";
  static readonly BG_BRIGHT_CYAN = "\x1b[106m";
  static readonly BG_BRIGHT_WHITE = "\x1b[107m";

  // Styles
  static readonly BOLD = "\x1b[1m";
  static readonly UNDERLINE = "\x1b[4m";
  static readonly RESET = "\x1b[0m";
}

export function prTitle(message: string): void {
  console.log(
    `\n${Ansi.BOLD}${Ansi.UNDERLINE}${Ansi.BG_BLUE}${Ansi.BRIGHT_BLACK}  ${message}  ${Ansi.RESET}\n`
  );
}

export function prMessage(message: string): void {
  console.log(`\n${Ansi.BOLD}${Ansi.BRIGHT_BLUE}${message}${Ansi.RESET}\n`);
}

export function prAlert(message: string): void {
  console.log(
    `\n${Ansi.BOLD}${Ansi.BG_YELLOW}${Ansi.BRIGHT_BLUE}${message}${Ansi.RESET}\n`
  );
}

export function prContinue(): void {
  const message = "  You can continue ✅  ";
  console.log(
    `\n${Ansi.BOLD}${Ansi.BG_GREEN}${Ansi.BRIGHT_BLACK}${message}${Ansi.RESET}\n\n`
  );
}

// Helper function for sleeping
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to check the health of a container
export async function isServiceHealthy(
  healthCheckUrl: string
): Promise<boolean> {
  console.log(`Checking health at: ${healthCheckUrl}`);

  try {
    const response = await fetch(healthCheckUrl);

    if (response.ok) {
      console.log(`Received status: ${response.status}. Service is healthy.`);
      return true;
    } else {
      console.warn(
        `Received a non-ok status: ${response.status}. Service is running but may be unhealthy.`
      );
      return false;
    }
  } catch (error) {
    console.error(
      `Failed to connect to service. It may be down. Error:`,
      error.message
    );
    return false;
  }
}

// Default KERIA connection parameters (adjust as needed for your environment)
export const DEFAULT_ADMIN_URL = "http://keria:3901";
export const DEFAULT_BOOT_URL = "http://keria:3903";
export const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds for operations
export const DEFAULT_DELAY_MS = 5000; // 5 seconds for operations
export const DEFAULT_RETRIES = 5; // For retries
export const ROLE_AGENT = "agent";
export const IPEX_GRANT_ROUTE = "/exn/ipex/grant";
export const IPEX_ADMIT_ROUTE = "/exn/ipex/admit";
export const IPEX_APPLY_ROUTE = "/exn/ipex/apply";
export const IPEX_OFFER_ROUTE = "/exn/ipex/offer";
export const SCHEMA_SERVER_HOST = "http://vlei-server:7723";

export const DEFAULT_IDENTIFIER_ARGS = {
  toad: 3,
  wits: [
    "BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha",
    "BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM",
    "BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX",
  ],
};

/**
 * Initializes the Signify-ts library.
 */
export async function initializeSignify() {
  await ready();
  console.log("Signify-ts library initialized.");
}

/**
 * Creates a new SignifyClient instance, boots it, and connects to the KERIA agent.
 *
 * @returns {Promise<{ client: SignifyClient; clientState: State }>}
 * The initialized client and state.
 */
export async function initializeAndConnectClient(
  bran: string,
  adminUrl: string = DEFAULT_ADMIN_URL,
  bootUrl: string = DEFAULT_BOOT_URL,
  tier: Tier = Tier.low
): Promise<{ client: SignifyClient; clientState: any }> {
  console.log(`Using Passcode (bran): ${bran}`);

  const client = new SignifyClient(adminUrl, bran, tier, bootUrl);

  try {
    await client.boot();
    console.log("Client boot process initiated with KERIA agent.");

    await client.connect();
    const clientState = await client.state();

    console.log("  Client AID Prefix: ", clientState?.controller?.state?.i);
    console.log("  Agent AID Prefix:  ", clientState?.agent?.i);

    return { client, clientState };
  } catch (error) {
    console.error("Failed to initialize or connect client:", error);
    throw error;
  }
}

/**
 * Creates a new AID using the provided client.
 */
export async function createNewAID(
  client: SignifyClient,
  alias: string,
  identifierArgs: CreateIdentiferArgs = DEFAULT_IDENTIFIER_ARGS
): Promise<{ aid: any; operation: Operation<any> }> {
  console.log(`Initiating AID inception for alias: ${alias}`);
  try {
    const inceptionResult = await client
      .identifiers()
      .create(alias, identifierArgs as any);
    const operationDetails = await inceptionResult.op();

    const completedOperation = await client
      .operations()
      .wait(operationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      throw new Error(
        `AID creation failed: ${JSON.stringify(completedOperation.error)}`
      );
    }

    const newAidInceptionEvent = completedOperation.response;
    console.log(
      `Successfully created AID with prefix: ${newAidInceptionEvent?.i}`
    );

    await client.operations().delete(completedOperation.name);

    return { aid: newAidInceptionEvent, operation: completedOperation };
  } catch (error) {
    console.error(`Failed to create AID for alias "${alias}":`, error);
    throw error;
  }
}

/**
 * Assigns an end role for a given AID to the client's KERIA Agent AID.
 */
export async function addEndRoleForAID(
  client: SignifyClient,
  aidAlias: string,
  role: string
): Promise<{ operation: Operation<any> }> {
  if (!client.agent?.pre) {
    throw new Error("Client agent prefix is not available.");
  }
  const agentAIDPrefix = client.agent.pre;

  console.log(
    `Assigning '${role}' role to KERIA Agent ${agentAIDPrefix} for AID alias ${aidAlias}`
  );
  try {
    const addRoleResult = await client
      .identifiers()
      .addEndRole(aidAlias, role, agentAIDPrefix);

    const operationDetails = await addRoleResult.op();

    const completedOperation = await client
      .operations()
      .wait(operationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    console.log(
      `Successfully assigned '${role}' role for AID alias ${aidAlias}.`
    );

    await client.operations().delete(completedOperation.name);

    return { operation: completedOperation };
  } catch (error) {
    console.error(`Failed to add end role for AID alias "${aidAlias}":`, error);
    throw error;
  }
}

/**
 * Resolves an OOBI URL
 */
export async function resolveOOBI(
  client: SignifyClient,
  oobiUrl: string,
  contactAlias?: string
): Promise<{ operation: Operation<any>; contacts?: Contact[] }> {
  console.log(`Resolving OOBI URL: ${oobiUrl} with alias ${contactAlias}`);
  try {
    const resolveOperationDetails = await client
      .oobis()
      .resolve(oobiUrl, contactAlias);
    const completedOperation = await client
      .operations()
      .wait(resolveOperationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      throw new Error(
        `OOBI resolution failed: ${JSON.stringify(completedOperation.error)}`
      );
    }
    console.log(
      `Successfully resolved OOBI URL. Response:`,
      completedOperation.response ? "OK" : "No response data"
    );

    const contacts = await client
      .contacts()
      .list(undefined, "alias", contactAlias);

    if (contacts) {
      console.log(`Contact "${contactAlias}" added/updated.`);
    } else {
      console.warn(
        `Contact "${contactAlias}" not found after OOBI resolution.`
      );
    }

    await client.operations().delete(completedOperation.name);

    return { operation: completedOperation, contacts: contacts };
  } catch (error) {
    console.error(`Failed to resolve OOBI URL "${oobiUrl}":`, error);
    throw error;
  }
}

/**
 * Verifies a challenge response received from another AID.
 */
export async function verifyChallengeResponse(
  client: SignifyClient,
  allegedSenderAidPrefix: string,
  originalChallengeWords: string[]
): Promise<{ verified: boolean; said?: string; operation?: Operation<any> }> {
  console.log(
    `Verifying challenge response from AID '${allegedSenderAidPrefix}'...`
  );
  try {
    const verifyOperation = await client
      .challenges()
      .verify(allegedSenderAidPrefix, originalChallengeWords);
    const completedOperation = await client
      .operations()
      .wait(verifyOperation, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      console.error("Challenge verification failed:", completedOperation.error);
      await client.operations().delete(completedOperation.name);
      return { verified: false, operation: completedOperation };
    }

    const said = (completedOperation.response as any)?.exn?.d;
    console.log(
      `Challenge response verified successfully. SAID of exn: ${said}`
    );

    await client.operations().delete(completedOperation.name);

    return { verified: true, said: said, operation: completedOperation };
  } catch (error) {
    console.error("Failed to verify challenge response:", error);
    throw error;
  }
}

/**
 * Creates a new credential registry for an AID.
 */
export async function createCredentialRegistry(
  client: SignifyClient,
  aidAlias: string,
  registryName: string
): Promise<{ registrySaid: any; operation: Operation<any> }> {
  console.log(
    `Creating credential registry "${registryName}" for AID alias "${aidAlias}"...`
  );
  try {
    const createRegistryResult = await client
      .registries()
      .create({ name: aidAlias, registryName: registryName });

    const operationDetails = await createRegistryResult.op();
    const completedOperation = await client
      .operations()
      .wait(operationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      throw new Error(
        `Credential registry creation failed: ${JSON.stringify(
          completedOperation.error
        )}`
      );
    }

    const registrySaid = (completedOperation?.response as any)?.anchor?.i;
    console.log(`Successfully created credential registry: ${registrySaid}`);

    await client.operations().delete(completedOperation.name);
    return { registrySaid, operation: completedOperation };
  } catch (error) {
    console.error(
      `Failed to create credential registry "${registryName}":`,
      error
    );
    throw error;
  }
}

/**
 * Issues a new credential.
 */
export async function issueCredential(
  client: SignifyClient,
  issuerAidAlias: string,
  registryIdentifier: string,
  schemaSaid: string,
  holderAidPrefix: string,
  credentialClaims: any,
  edges?: any,
  rules?: any,
  salt = false
): Promise<{ credentialSaid: string; operation: Operation<any> }> {
  console.log(
    `Issuing credential from AID "${issuerAidAlias}" to AID "${holderAidPrefix}"...`
  );
  try {
    const issueResult = await client.credentials().issue(issuerAidAlias, {
      ri: registryIdentifier,
      s: schemaSaid,
      u: salt ? new Salter({}).qb64 : undefined,
      a: {
        i: holderAidPrefix,
        ...credentialClaims,
      },
      e: edges,
      r: rules,
    });

    const operationDetails = await issueResult.op;
    const completedOperation = await client
      .operations()
      .wait(operationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      throw new Error(
        `Credential issuance failed: ${JSON.stringify(
          completedOperation.error
        )}`
      );
    }
    console.log(completedOperation); // ************
    const credentialSad = completedOperation.response; // The full Self-Addressing Data (SAD) of the credential
    const credentialSaid = (credentialSad as any)?.ced?.d; // The SAID of the credential
    console.log(`Successfully issued credential with SAID: ${credentialSaid}`);

    await client.operations().delete(completedOperation.name);
    return { credentialSaid, operation: completedOperation };
  } catch (error) {
    console.error("Failed to issue credential:", error);
    throw error;
  }
}

/**
 * Submits an IPEX grant for a credential.
 */
export async function ipexGrantCredential(
  client: SignifyClient,
  senderAidAlias: string,
  recipientAidPrefix: string,
  acdc: any
): Promise<{ operation: Operation<any> }> {
  console.log(
    `AID "${senderAidAlias}" granting credential to AID "${recipientAidPrefix}" via IPEX...`
  );
  try {
    const [grant, gsigs, gend] = await client.ipex().grant({
      senderName: senderAidAlias,
      acdc: new Serder(acdc?.sad),
      iss: new Serder(acdc?.iss),
      anc: new Serder(acdc?.anc),
      ancAttachment: acdc.ancatc,
      recipient: recipientAidPrefix,
      datetime: createTimestamp(),
    });

    const submitGrantOperationDetails = await client
      .ipex()
      .submitGrant(senderAidAlias, grant, gsigs, gend, [recipientAidPrefix]);

    const completedOperation = await client
      .operations()
      .wait(
        submitGrantOperationDetails,
        { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) }
      );

    if (completedOperation.error) {
      throw new Error(
        `IPEX grant submission failed: ${JSON.stringify(
          completedOperation.error
        )}`
      );
    }

    console.log(
      `Successfully submitted IPEX grant from "${senderAidAlias}" to "${recipientAidPrefix}".`
    );
    await client.operations().delete(completedOperation.name);
    return { operation: completedOperation };
  } catch (error) {
    console.error("Failed to submit IPEX grant:", error);
    throw error;
  }
}

/**
 * Submits an IPEX apply (presentation request).
 */
export async function ipexApplyForCredential(
  client: SignifyClient,
  senderAidAlias: string,
  recipientAidPrefix: string,
  schemaSaid: string,
  attributes: any,
  datetime: string
): Promise<{ operation: Operation<any>; applySaid: string }> {
  console.log(
    `AID "${senderAidAlias}" applying for credential presentation from AID "${recipientAidPrefix}"...`
  );
  try {
    const [apply, sigs, _] = await client.ipex().apply({
      senderName: senderAidAlias,
      schemaSaid: schemaSaid,
      attributes: attributes,
      recipient: recipientAidPrefix,
      datetime: datetime,
    });

    const applySaid = (new Serder(apply) as any).said; // Get SAID of the apply message itself

    const applyOperationDetails = await client
      .ipex()
      .submitApply(senderAidAlias, apply, sigs, [recipientAidPrefix]);

    const completedOperation = await client
      .operations()
      .wait(applyOperationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      throw new Error(
        `IPEX apply submission failed: ${JSON.stringify(
          completedOperation.error
        )}`
      );
    }
    console.log(`Successfully submitted IPEX apply with SAID "${applySaid}".`);
    await client.operations().delete(completedOperation.name);
    return { operation: completedOperation, applySaid };
  } catch (error) {
    console.error("Failed to submit IPEX apply:", error);
    throw error;
  }
}

/**
 * Submits an IPEX offer (presents a credential).
 */
export async function ipexOfferCredential(
  client: SignifyClient,
  senderAidAlias: string,
  recipientAidPrefix: string,
  acdcSad: any, // This is the SAD of the credential to be offered
  applySaid: string,
  datetime: string
): Promise<{ operation: Operation<any> }> {
  console.log(
    `AID "${senderAidAlias}" offering credential to AID "${recipientAidPrefix}" in response to apply "${applySaid}"...`
  );
  try {
    const [offer, sigs, end] = await client.ipex().offer({
      senderName: senderAidAlias,
      recipient: recipientAidPrefix,
      acdc: new Serder(acdcSad), // The credential SAD needs to be wrapped in Serder
      applySaid: applySaid,
      datetime: datetime,
    });

    const offerOperationDetails = await client
      .ipex()
      .submitOffer(senderAidAlias, offer, sigs, end, [recipientAidPrefix]);

    const completedOperation = await client
      .operations()
      .wait(offerOperationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      throw new Error(
        `IPEX offer submission failed: ${JSON.stringify(
          completedOperation.error
        )}`
      );
    }
    console.log(
      `Successfully submitted IPEX offer in response to apply "${applySaid}".`
    );
    await client.operations().delete(completedOperation.name);
    return { operation: completedOperation };
  } catch (error) {
    console.error("Failed to submit IPEX offer:", error);
    throw error;
  }
}

/**
 * Submits an IPEX agree (verifier agrees to the offered credential).
 */
export async function ipexAgreeToOffer(
  client: SignifyClient,
  senderAidAlias: string,
  recipientAidPrefix: string,
  offerSaid: string,
  datetime: string
): Promise<{ operation: Operation<any> }> {
  console.log(
    `AID "${senderAidAlias}" agreeing to IPEX offer "${offerSaid}" from AID "${recipientAidPrefix}"...`
  );
  try {
    const [agree, sigs, _] = await client.ipex().agree({
      senderName: senderAidAlias,
      recipient: recipientAidPrefix,
      offerSaid: offerSaid,
      datetime: datetime,
    });

    const agreeOperationDetails = await client
      .ipex()
      .submitAgree(senderAidAlias, agree, sigs, [recipientAidPrefix]);

    const completedOperation = await client
      .operations()
      .wait(agreeOperationDetails, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });

    if (completedOperation.error) {
      throw new Error(
        `IPEX agree submission failed: ${JSON.stringify(
          completedOperation.error
        )}`
      );
    }
    console.log(`Successfully submitted IPEX agree for offer "${offerSaid}".`);
    await client.operations().delete(completedOperation.name);
    return { operation: completedOperation };
  } catch (error) {
    console.error("Failed to submit IPEX agree:", error);
    throw error;
  }
}

export async function test() {
  try {
    await initializeSignify();

    // --- Client A (Alfred) Setup ---
    console.log("\n--- Initializing Client A (Alfred) ---");
    const { client: clientA, clientState: clientAState } =
      await initializeAndConnectClient(randomPasscode());
    const alfredClientAID =
      (clientAState as any)?.controller?.state?.i || "Unknown Client AID A";
    const aidAAlias = "alfredPrimaryAID";
    console.log("\n--- Creating AID for Alfred ---");
    const { aid: aidAObj } = await createNewAID(
      clientA,
      aidAAlias,
      DEFAULT_IDENTIFIER_ARGS
    );
    const aidAPrefix = aidAObj?.i || "Unknown AID A Prefix";
    console.log(`Alfred's primary AID: ${aidAPrefix}`);
    console.log("\n--- Adding Agent End Role for Alfred ---");
    await addEndRoleForAID(clientA, aidAAlias, "agent");
    console.log("\n--- Generating OOBI for Alfred ---");
    const alfredOOBI = await generateOOBI(clientA, aidAAlias, "agent");

    // --- Client B (Betty) Setup ---
    console.log("\n\n--- Initializing Client B (Betty) ---");
    const { client: clientB, clientState: clientBState } =
      await initializeAndConnectClient(randomPasscode());
    const bettyClientAID =
      (clientBState as any)?.controller?.state?.i || "Unknown Client AID B";
    const aidBAlias = "bettyPrimaryAID";
    console.log("\n--- Creating AID for Betty ---");
    const { aid: aidBObj } = await createNewAID(
      clientB,
      aidBAlias,
      DEFAULT_IDENTIFIER_ARGS
    );
    const aidBPrefix = aidBObj?.i || "Unknown AID B Prefix";
    console.log(`Betty's primary AID: ${aidBPrefix}`);
    console.log("\n--- Adding Agent End Role for Betty ---");
    await addEndRoleForAID(clientB, aidBAlias, "agent");
    console.log("\n--- Generating OOBI for Betty ---");
    const bettyOOBI = await generateOOBI(clientB, aidBAlias, "agent");

    // --- OOBI Resolution ---
    console.log("\n\n--- Betty resolving Alfred's OOBI ---");
    const contactAlfredAlias = "AlfredsContactForBetty";
    await resolveOOBI(clientB, alfredOOBI, contactAlfredAlias);

    console.log("\n--- Alfred resolving Betty's OOBI ---");
    const contactBettyAlias = "BettysContactForAlfred";
    await resolveOOBI(clientA, bettyOOBI, contactBettyAlias);

    // --- Challenge/Response: Alfred challenges Betty ---
    console.log("\n\n--- MUTUAL AUTHENTICATION ---");
    console.log("\n--- Alfred challenges Betty ---");

    // 1. Alfred generates challenge words for Betty
    const alfredChallengeForBetty = await generateChallengeWords(clientA);

    // (Assume words are securely transmitted out-of-band to Betty)

    // 2. Betty responds to Alfred's challenge
    console.log(
      `\nBetty (AID: ${aidBPrefix}) responding to Alfred's (AID: ${aidAPrefix}) challenge...`
    );
    await respondToChallenge(
      clientB,
      aidBAlias,
      aidAPrefix,
      alfredChallengeForBetty
    );

    // 3. Alfred verifies Betty's response
    console.log(
      `\nAlfred (AID: ${aidAPrefix}) verifying Betty's (AID: ${aidBPrefix}) response...`
    );
    const verificationBetty = await verifyChallengeResponse(
      clientA,
      aidBPrefix,
      alfredChallengeForBetty
    );

    // 4. Alfred marks Betty as authenticated if verification succeeded
    if (verificationBetty.verified && verificationBetty.said) {
      await markChallengeAuthenticated(
        clientA,
        aidBPrefix,
        verificationBetty.said
      );
      console.log(
        `Alfred has successfully authenticated Betty (AID: ${aidBPrefix}).`
      );
    } else {
      console.error(
        `Alfred failed to authenticate Betty (AID: ${aidBPrefix}).`
      );
    }

    // --- Challenge/Response: Betty challenges Alfred ---
    console.log("\n--- Betty challenges Alfred ---");

    // 1. Betty generates challenge words for Alfred
    const bettyChallengeForAlfred = await generateChallengeWords(clientB);

    // (Assume words are securely transmitted out-of-band to Alfred)

    // 2. Alfred responds to Betty's challenge
    console.log(
      `\nAlfred (AID: ${aidAPrefix}) responding to Betty's (AID: ${aidBPrefix}) challenge...`
    );
    await respondToChallenge(
      clientA,
      aidAAlias,
      aidBPrefix,
      bettyChallengeForAlfred
    );

    // 3. Betty verifies Alfred's response
    console.log(
      `\nBetty (AID: ${aidBPrefix}) verifying Alfred's (AID: ${aidAPrefix}) response...`
    );
    const verificationAlfred = await verifyChallengeResponse(
      clientB,
      aidAPrefix,
      bettyChallengeForAlfred
    );

    // 4. Betty marks Alfred as authenticated if verification succeeded
    if (verificationAlfred.verified && verificationAlfred.said) {
      await markChallengeAuthenticated(
        clientB,
        aidAPrefix,
        verificationAlfred.said
      );
      console.log(
        `Betty has successfully authenticated Alfred (AID: ${aidAPrefix}).`
      );
    } else {
      console.error(
        `Betty failed to authenticate Alfred (AID: ${aidAPrefix}).`
      );
    }

    console.log(
      "\n\n--- Example scenario with mutual authentication completed! ---"
    );
    console.log(
      `Alfred's Client AID: ${alfredClientAID}, Primary AID: ${aidAPrefix}`
    );
    console.log(
      `Betty's Client AID: ${bettyClientAID}, Primary AID: ${aidBPrefix}`
    );

    // You can inspect contacts to see authentication status
    const alfredsContacts = await clientA.contacts().list();
    console.log(
      "\nAlfred's contacts:",
      JSON.stringify(alfredsContacts, null, 2)
    );
    const bettysContacts = await clientB.contacts().list();
    console.log("\nBetty's contacts:", JSON.stringify(bettysContacts, null, 2));
  } catch (error) {
    console.error("\n--- An error occurred in the main example: ---", error);
  }
}
