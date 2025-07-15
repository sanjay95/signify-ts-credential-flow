import {
  Oobis,
  randomPasscode,
  Saider,
  Serder,
  SignifyClient,
} from "signify-ts";

export type AccountType = "GLEIF" | "QVI" | "LE" | "LE-OOR";

export type Role = "issuer" | "holder" | "verifier";

export interface AccountConfig {
  type: AccountType;
  alias: string;
  passcode: string;
  aid: string;
  oobi: string;
  registrySaid?: string;
}

export const SCHEMAS = {
  QVI: "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao",
  LE: "ENPXp1vQzRF6JwIuS-mp2U8Uf1MoADoP_GqQ62VsDZWY",
  ECR_AUTH: "EH6ekLjSr8V32WyFbGe1zXjTzFs9PkTYmupJ9H65O14g",
  ECR: "EEy9PkikFcANV1l7EHukCeXqrzT1hNZjGlUk7wuMO5jw",
  OOR_AUTH: "EKA57bKBKxr_kN7iN5i7lMUxpMG-s19dRcmov1iDxz-E",
  OOR: "EBNaNu-M9P5cgrnfl2Fvymy4E_jvxxyjb70PRtiANlJy",
} as const;

export interface SchemaOption {
  name: string;
  said: string;
  description: string;
  targetTypes: AccountType[];
}

export const SCHEMA_OPTIONS: SchemaOption[] = [
  {
    name: "QVI Credential",
    said: SCHEMAS.QVI,
    description:
      "Issued by GLEIF to a QVI, authorizing it to issue vLEI credentials",
    targetTypes: ["QVI"],
  },
  {
    name: "vLEI Credential",
    said: SCHEMAS.LE,
    description:
      "Issued by a QVI to a Legal Entity, representing its digital identity",
    targetTypes: ["LE"],
  },
  {
    name: "OOR Auth Credential",
    said: SCHEMAS.OOR_AUTH,
    description:
      "Authorization issued by a Legal Entity to a QVI for OOR credentials",
    targetTypes: ["QVI"],
  },
  {
    name: "OOR Credential",
    said: SCHEMAS.OOR,
    description: "Issued to an individual in an official capacity (e.g., CEO)",
    targetTypes: ["LE-OOR"],
  },
  {
    name: "ECR Auth Credential",
    said: SCHEMAS.ECR_AUTH,
    description: "Authorization issued by a Legal Entity for ECR credentials",
    targetTypes: ["QVI"],
  },
  {
    name: "ECR Credential",
    said: SCHEMAS.ECR,
    description: "Issued to an individual for a specific business role",
    targetTypes: ["LE-OOR"],
  },
];

export const getAvailableSchemas = (
  accountType: AccountType
): SchemaOption[] => {
  switch (accountType) {
    case "GLEIF":
      return SCHEMA_OPTIONS.filter((s) => s.name === "QVI Credential");
    case "QVI":
      return SCHEMA_OPTIONS.filter(
        (s) => s.name === "vLEI Credential" || s.name === "ECR Credential"
      );
    case "LE":
      return SCHEMA_OPTIONS.filter(
        (s) =>
          s.name === "ECR Credential" ||
          s.name === "OOR Auth Credential" ||
          s.name === "ECR Auth Credential"
      );
    case "LE-OOR":
      return SCHEMA_OPTIONS.filter(
        (s) => s.name === "OOR Credential" || s.name === "OOR Auth Credential"
      );
    default:
      return [];
  }
};

export const PRECONFIGURED_OOBIS: Record<AccountType, string[]> = {
  GLEIF: [],
  QVI: [
    "https://keria.testnet.gleif.org:3901/oobi/EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2",
  ],
  LE: [
    "https://keria.testnet.gleif.org:3901/oobi/EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2",
  ],
  "LE-OOR": [
    "https://keria.testnet.gleif.org:3901/oobi/EDP1vHcw_wc4M__Fj53-cJaBnZZASd-aMTaSyWEQ-PC2",
  ],
};

export const LE_RULES = Saider.saidify({
  d: "",
  usageDisclaimer: {
    l: "Usage of a valid, unexpired, and non-revoked vLEI Credential, as defined in the associated Ecosystem Governance Framework, does not assert that the Legal Entity is trustworthy, honest, reputable in its business dealings, safe to do business with, or compliant with any laws or that an implied or expressly intended purpose will be fulfilled.",
  },
  issuanceDisclaimer: {
    l: "All information in a valid, unexpired, and non-revoked vLEI Credential, as defined in the associated Ecosystem Governance Framework, is accurate as of the date the validation process was complete. The vLEI Credential has been issued to the legal entity or person named in the vLEI Credential as the subject; and the qualified vLEI Issuer exercised reasonable care to perform the validation process set forth in the vLEI Ecosystem Governance Framework.",
  },
})[1];

export const ECR_RULES = Saider.saidify({
  d: "",
  usageDisclaimer: {
    l: "Usage of a valid, unexpired, and non-revoked vLEI Credential, as defined in the associated Ecosystem Governance Framework, does not assert that the Legal Entity is trustworthy, honest, reputable in its business dealings, safe to do business with, or compliant with any laws or that an implied or expressly intended purpose will be fulfilled.",
  },
  issuanceDisclaimer: {
    l: "All information in a valid, unexpired, and non-revoked vLEI Credential, as defined in the associated Ecosystem Governance Framework, is accurate as of the date the validation process was complete. The vLEI Credential has been issued to the legal entity or person named in the vLEI Credential as the subject; and the qualified vLEI Issuer exercised reasonable care to perform the validation process set forth in the vLEI Ecosystem Governance Framework.",
  },
  privacyDisclaimer: {
    l: "It is the sole responsibility of Holders as Issuees of an ECR vLEI Credential to present that Credential in a privacy-preserving manner using the mechanisms provided in the Issuance and Presentation Exchange (IPEX) protocol specification and the Authentic Chained Data Container (ACDC) specification. https://github.com/WebOfTrust/IETF-IPEX and https://github.com/trustoverip/tswg-acdc-specification.",
  },
})[1];

export const ECR_AUTH_RULES = Saider.saidify({
  d: "",
  usageDisclaimer: {
    l: "Usage of a valid, unexpired, and non-revoked vLEI Credential, as defined in the associated Ecosystem Governance Framework, does not assert that the Legal Entity is trustworthy, honest, reputable in its business dealings, safe to do business with, or compliant with any laws or that an implied or expressly intended purpose will be fulfilled.",
  },
  issuanceDisclaimer: {
    l: "All information in a valid, unexpired, and non-revoked vLEI Credential, as defined in the associated Ecosystem Governance Framework, is accurate as of the date the validation process was complete. The vLEI Credential has been issued to the legal entity or person named in the vLEI Credential as the subject; and the qualified vLEI Issuer exercised reasonable care to perform the validation process set forth in the vLEI Ecosystem Governance Framework.",
  },
  privacyDisclaimer: {
    l: "Privacy Considerations are applicable to QVI ECR AUTH vLEI Credentials.  It is the sole responsibility of QVIs as Issuees of QVI ECR AUTH vLEI Credentials to present these Credentials in a privacy-preserving manner using the mechanisms provided in the Issuance and Presentation Exchange (IPEX) protocol specification and the Authentic Chained Data Container (ACDC) specification.  https://github.com/WebOfTrust/IETF-IPEX and https://github.com/trustoverip/tswg-acdc-specification.",
  },
})[1];
export const OOR_RULES = LE_RULES;
export const OOR_AUTH_RULES = LE_RULES;

export const LEIPayload = {
  LEI: "",
};

export const ecrData = {
  LEI: "",
  personLegalName: "John Doe",
  engagementContextRole: "Managing Director",
};

export const credPayload: (schemaSaid: string) => any = (
  schemaSaid: string
) => {
  // Return payload based on schemaSaid, update as needed
  switch (schemaSaid) {
    case SCHEMAS.LE:
    case SCHEMAS.QVI:
      return { ...LEIPayload };
    case SCHEMAS.ECR:
      return { ...ecrData };
    default:
      return {};
  }
};

export const sallyOOBI =
  "https://presentation-handler.testnet.gleif.org:9723/oobi/EG7EWkD1-wYfQGWaCkXGKbDlqf82AIwOu0dt3URWvqAh";
