import React, { useEffect, useState } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { resolveOOBI, initializeAndConnectClient } from "../utils/utils";
import { SignifyClient } from "signify-ts";
import { set } from "date-fns";

interface ContactsSectionProps {
  client: SignifyClient; // Optional client prop for testing
}

export const ContactsSection: React.FC<ContactsSectionProps> = ({ client }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [oobiInput, setOobiInput] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oobiResolved, setOobiResolved] = useState(false);

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line
  }, [oobiResolved]);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const contactList = await client.contacts().list();
      setContacts(contactList || []);
      console.log("Fetched contacts:", contactList);
    } catch (err: any) {
      setError("Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!oobiInput) return;
    setLoading(true);
    setError(null);
    try {
      console.log(client, "OOBI Input:", oobiInput, "Alias Input:", aliasInput);

      await resolveOOBI(client, oobiInput, aliasInput);
      setOobiInput("");
      setAliasInput("");
      setOobiResolved(true);
    } catch (err: any) {
      setError("Failed to resolve/add contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="OOBI URL"
          value={oobiInput}
          onChange={(e) => setOobiInput(e.target.value)}
        />
        <Input
          placeholder="Contact Alias (optional)"
          value={aliasInput}
          onChange={(e) => setAliasInput(e.target.value)}
        />
        <Button onClick={handleAddContact} disabled={loading || !oobiInput}>
          {loading ? "Adding..." : "Resolve & Add"}
        </Button>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div>
        <h4 className="font-medium mb-1">Connected Contacts</h4>
        {contacts.length === 0 ? (
          <div className="text-gray-500 text-sm">No contacts found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {contacts.map((contact: any) => (
              <li key={contact.id || contact.aid} className="py-2">
                <div className="flex flex-col">
                  <span className="text-sm">
                    Alias:{" "}
                    {contact.alias || (
                      <span className="italic text-gray-400">(none)</span>
                    )}
                  </span>
                  <span className="font-mono text-xs break-all">
                    AID: {contact.id}
                  </span>

                  {contact.oobi && (
                    <span className="text-xs text-gray-500">
                      OOBIs:{" "}
                      {Array.isArray(contact.oobi)
                        ? contact.oobi.join(", ")
                        : contact.oobi}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
