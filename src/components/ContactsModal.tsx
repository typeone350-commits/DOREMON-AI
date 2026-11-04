import React, { useState } from "react";
import { Contact } from "../types";
import { X, UserPlus, Phone, Tag, Trash2, Heart } from "lucide-react";

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onDirectCall: (phone: string) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onAddContact,
  onDeleteContact,
  onDirectCall,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [aliases, setAliases] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const aliasList = aliases
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const newContact: Contact = {
      id: "c_" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim() || "Contact",
      aliases: aliasList.length > 0 ? aliasList : [name.trim().toLowerCase()],
      avatar: "👤",
    };

    onAddContact(newContact);
    setName("");
    setPhone("");
    setRelationship("");
    setAliases("");
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Address Book & Contacts</h2>
              <p className="text-xs text-blue-100">
                Voice contact lookup for &ldquo;Call Mom&rdquo;, &ldquo;Call Rahul&rdquo;, etc.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500 font-medium">
              Configured Contacts ({contacts.length})
            </p>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Contact
              </button>
            )}
          </div>

          {/* Add form */}
          {isAdding && (
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3"
            >
              <h4 className="font-bold text-xs text-neutral-800">
                New Contact Details
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-600 font-medium block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Papa / Rahul"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-600 font-medium block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-600 font-medium block mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    placeholder="Father, Friend, etc."
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-600 font-medium block mb-1">
                    Voice Aliases (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="papa, dad, pitaji"
                    value={aliases}
                    onChange={(e) => setAliases(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  Save Contact
                </button>
              </div>
            </form>
          )}

          {/* Contacts List */}
          <div className="space-y-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-2xl border border-neutral-200 hover:border-blue-300 bg-neutral-50/50 flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shrink-0">
                    {c.avatar || "👤"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-neutral-900 truncate">
                        {c.name}
                      </span>
                      {c.relationship && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 shrink-0">
                          {c.relationship}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-neutral-600 truncate mt-0.5">
                      {c.phone}
                    </p>
                    {c.aliases && c.aliases.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-400">
                        <Tag className="w-2.5 h-2.5" />
                        <span className="truncate">
                          Aliases: {c.aliases.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onDirectCall(c.phone)}
                    title={`Call ${c.name}`}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                  {contacts.length > 2 && (
                    <button
                      onClick={() => onDeleteContact(c.id)}
                      title="Delete contact"
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <Heart className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Test Tip:</strong> We have two &ldquo;Rahul&rdquo; contacts
              (Rahul Sharma and Rahul Verma). Try saying &ldquo;Call Rahul&rdquo;
              to see Doremon detect multiple matches and politely ask which one
              you want!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
