import { useState, useEffect } from 'react'
import './App.css'

function App() {

  const [contacts, setContacts] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("dial");
  const [menuOpen, setMenuOpen] = useState(false) 
  const [currentDialPage, setCurrentDialPage] = useState("all");
  const [showKeypad, setShowKeypad] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedCall, setSelectedCall] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saveTo, setSaveTo] = useState("phone"); 
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactDetails, setShowContactDetails] = useState(false);

  const [showContactMenu, setShowContactMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [activeDeletedId, setActiveDeletedId] = useState(null);
  const [showBlockedOverlay, setShowBlockedOverlay] = useState(false);
  const [activeBlockedId, setActiveBlockedId] = useState(null);

  const handleSaveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) return;

    if (!/^\d{10}$/.test(contactPhone)) {
      alert("Enter a valid 10-digit phone number");
      return;
    }

    const payload = {
      name: contactName.trim(),
      phone: contactPhone.trim(),
      email: contactEmail.trim(),
      saveTo
    };

    let savedContact;

    if (isEditing) {
      // UPDATE
      const res = await fetch(
        `/api/contacts/${selectedContact.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      savedContact = await res.json();

      setContacts(prev =>
        prev.map(c => (c.id === savedContact.id ? savedContact : c))
      );

      setIsEditing(false);
    } else {
      // CREATE
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      savedContact = await res.json();

      setContacts(prev =>
        [...prev, savedContact].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    }
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setSaveTo("phone");
    setShowSaveOptions(false);
    setShowAddContact(false);
    setSelectedContact(savedContact);
    setShowContactDetails(true);
    setContactMenuOpen(false);
  };

  const [showSaveOptions, setShowSaveOptions] = useState(false);

  const triggerLongPress = (e, call) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 150,
      y: rect.top + window.scrollY
    });
    setSelectedCall(call);
    setShowCallMenu(true);
  };

  const favourites = contacts.filter(c => c.isFavourite && !c.isDeleted);
  const [deletedContacts, setDeletedContacts] = useState([]);
  const blockedContacts = contacts.filter(c => c.isBlocked && !c.isDeleted);


  const getHeaderText = () => {
    switch (activeTab) {
      case "dial":
        return "Dial";
      case "contacts":
        return "Contacts";
      case "favourites":
        return "Favourites";
      default:
        return "";
    }
  };

  useEffect(() => {
    const closeDialpad = () => setShowKeypad(false);

    window.addEventListener("wheel", closeDialpad);
    window.addEventListener("scroll", closeDialpad);
    window.addEventListener("touchmove", closeDialpad);

    return () => {
      window.removeEventListener("wheel", closeDialpad);
      window.removeEventListener("scroll", closeDialpad);
      window.removeEventListener("touchmove", closeDialpad);
    };
  }, []);

  // When opening deleted or blocked overlay
  const openDeletedOverlay = () => {
    setSelectedContact(null);    
    setShowDeletedOverlay(true);
  };

  const openBlockedOverlay = () => {
    setSelectedContact(null);      
    setShowBlockedOverlay(true);
  };

  useEffect(() => {
    fetch("/api/contacts")
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(err => console.error(err));
  }, []);

  const toggleFavourite = async (contact) => {
    const updated = { ...contact, isFavourite: !contact.isFavourite };
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    setContacts(prev => prev.map(c => c.id === contact.id ? updated : c));
  };

  // Toggle block
  const toggleBlock = async (contact) => {
    const updated = { ...contact, isBlocked: !contact.isBlocked };
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    setContacts(prev => prev.map(c => c.id === contact.id ? updated : c));
  };

  useEffect(() => {
    fetch("/api/deleted")
      .then(res => res.json())
      .then(data => setDeletedContacts(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    fetch("/api/calls")
      .then(res => res.json())
      .then(data => setCallHistory(data))
      .catch(err => console.error(err));
  }, []);



  // Delete contact (soft delete)
  const deleteContact = async (contact) => {
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE"
      });

      // update frontend only
      setContacts(prev => prev.filter(c => c.id !== contact.id));

      setDeletedContacts(prev => [...prev, contact]);
    } catch (err) {
      console.error("Failed to delete contact", err);
    }
  };


  const clearCallHistory = async () => {
    try {
      await fetch("/api/calls", {
        method: "DELETE"
      });
    } catch (err) {
      console.error("Failed to clear call history", err);
    }
    setCallHistory([])
  };






  const restoreContact = async (id) => {
    try {
      await fetch(`/api/contacts/restore/${id}`, {
        method: "POST",
      });

      // remove from deleted page
      setDeletedContacts(prev => prev.filter(c => c.id !== id));

      // reload contacts from backend
      const res = await fetch("/api/contacts");
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error("Restore failed", err);
    }
  };



  // Add call
  const addCall = async (number) => {
    const newCall = {
      number,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCall)
      });
      const savedCall = await res.json();
      setCallHistory(prev => [savedCall, ...prev]);
    } catch (err) {
      console.error("Failed to add call", err);
    }
  };
  



  return (
    <>
      <header>
        <h2>{getHeaderText()}</h2>
      </header>
      <div className="middle">
        {activeTab === "dial" && (
          <div id="dial" className="dial page">
            <span className="dots" onClick={() => setMenuOpen(!menuOpen)}>⋮</span>
            {menuOpen && (
              <div className="menu-popup">
                <div
                  className="menu-item"
                  onClick={() => {
                    alert("Block spam calls");
                    setMenuOpen(false);
                  }}
                >
                  Block spam calls
                </div>
                <div
                  className="menu-item"
                  onClick={() => {
                    alert("Call settings");
                    setMenuOpen(false);
                  }}
                >
                  Call settings
                </div>
                <div
                  className="menu-item"
                  onClick={() => {
                    setCallHistory([]);
                    clearCallHistory();
                    setMenuOpen(false);
                  }}
                >
                  Clear History
                </div>
              </div>
            )}
            <ul className="dial-tabs">
              <li>
                <a className={currentDialPage === "all" ? "active" : ""} 
                onClick={() => setCurrentDialPage("all")}>All</a>
              </li>
              <li >
                <a className={currentDialPage === "missed" ? "active" : ""} 
                onClick={() => setCurrentDialPage("missed")}>Missed</a>
              </li>
            </ul>
            {currentDialPage === "all" && (
              <div className="all" onScroll={() => setShowKeypad(false)}>
                {callHistory.length === 0 && <p>No calls yet</p>}
                {callHistory.map(call => {
                  const contact = contacts.find(c => c.phone === call.number);
                  return (
                    <div
                      key={call.id}
                      className="call-item"
                      onClick={async () => {
                        const number = call.number;

                        // Show calling alert
                        alert(`Calling ${number}...`);

                        // Save call again to history
                        const newCall = {
                          number,
                          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        };

                        try {
                          const res = await fetch("/api/calls", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(newCall),
                          });
                          const savedCall = await res.json();
                          setCallHistory(prev => [savedCall, ...prev]);
                        } catch (err) {
                          console.error("Failed to save call", err);
                        }
                      }}
                      onMouseDown={(e) => {
                        const timer = setTimeout(() => triggerLongPress(e, call), 600);
                        setLongPressTimer(timer);
                      }}
                      onMouseUp={() => clearTimeout(longPressTimer)}
                      onMouseLeave={() => clearTimeout(longPressTimer)}
                      onTouchStart={(e) => {
                        const timer = setTimeout(() => triggerLongPress(e, call), 600);
                        setLongPressTimer(timer);
                      }}
                      onTouchEnd={() => clearTimeout(longPressTimer)}
                    >
                      <div className="call-left">
                        <div className="call-number">{contact ? contact.name : call.number}</div>
                        <div className="call-time">{call.time}</div>
                      </div>
                      <div className="call-info">ℹ</div>
                    </div>

                  );
                })}
              </div>
            )}
            {showCallMenu && (
              <div
                className="call-popup"
                style={{ top: menuPosition.y, left: menuPosition.x }}
              >
                <div className="popup-item">Delete</div>

                <div className="popup-close" onClick={() => setShowCallMenu(false)}>
                  ×
                </div>
              </div>
            )}
            {currentDialPage === "missed" && (
              <div className="missed" onScroll={() => setShowKeypad(false)}>
                <p>Missed calls will appear here</p>
              </div>
            )}
            {!showKeypad && (
              <div className="dialpad-icon" onClick={() => setShowKeypad(true)}>
                <svg width="50" height="50" viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
                  <style>{`.dot { fill: #ffffff; r: 15; }`}</style>

                  <circle className="dot" cx="50" cy="40"/>
                  <circle className="dot" cx="100" cy="40"/>
                  <circle className="dot" cx="150" cy="40"/>

                  <circle className="dot" cx="50" cy="90"/>
                  <circle className="dot" cx="100" cy="90"/>
                  <circle className="dot" cx="150" cy="90"/>

                  <circle className="dot" cx="50" cy="140"/>
                  <circle className="dot" cx="100" cy="140"/>
                  <circle className="dot" cx="150" cy="140"/>

                  <circle className="dot" cx="100" cy="190"/>
                </svg>
              </div>
            )}
            {showKeypad && (
              <div className="dialpad-container">

                <div className="typed-number">{phoneNumber || " "}</div>

                <div className="dial-grid">
                  {[
                    {n:"1", l:""},
                    {n:"2", l:"abc"},
                    {n:"3", l:"def"},
                    {n:"4", l:"ghi"},
                    {n:"5", l:"jkl"},
                    {n:"6", l:"mno"},
                    {n:"7", l:"pqrs"},
                    {n:"8", l:"tuv"},
                    {n:"9", l:"wxyz"},
                    {n:"*", l:""},
                    {n:"0", l:"+"},
                    {n:"#", l:""},
                  ].map((item) => (
                    <div 
                      key={item.n}
                      className="dial-btn"
                      onClick={() => setPhoneNumber(prev => prev + item.n)}
                    >
                      <span className="num">{item.n}</span>
                      <span className="letters">{item.l}</span>
                    </div>
                  ))}
                </div>

                <div className="dial-footer">
                  <div
                    className="three-lines"
                    onClick={() => setShowBlockedPopup(true)}
                  >
                    ☰
                  </div>
                  {showBlockedPopup && (
                    <div className="blocked-popup">
                      <span className="blocked-text" onClick={() => alert("Blocked call logs")}>Blocked call logs</span>

                      <span
                        className="blocked-close"
                        onClick={() => setShowBlockedPopup(false)}
                      >
                        ✕
                      </span>
                    </div>
                  )}
                  <div
                    className="call-btn"
                    onClick={() => {
                      if (!phoneNumber.trim()) return;
                      addCall(phoneNumber);
                      setPhoneNumber("");
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.21c1.21.48 2.53.74 3.88.74a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1C9.94 22 2 14.06 2 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.35.26 2.67.74 3.88a1 1 0 0 1-.21 1.11l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <div
                    className="clear-btn"
                    onClick={() => setPhoneNumber(prev => prev.slice(0, -1))}
                  >
                    ⌫
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {activeTab === "contacts" && (
          <div id="cont" className="cont page">
            <span className="dots" onClick={() => setMenuOpen(!menuOpen)}>⋮</span>
            {menuOpen && (
              <div className="menu-popup">
                <div
                  className="menu-item"
                  onClick={() => setContactMenuOpen(prev => !prev)}
                >
                  Contact settings
                </div>
                {contactMenuOpen && (
                  <>
                    <div
                      className="menu-item"
                      onClick={() => {
                        setShowBlockedOverlay(true);
                        if (selectedContact) {
                          setBlockedContacts(prev => {
                            if (prev.some(b => b.id === selectedContact.id)) return prev;
                            return [...prev, selectedContact]; 
                          });
                          setShowContactDetails(false);
                        }
                        setContactMenuOpen(false);
                      }}
                    >
                      Blocked
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => {
                        setShowDeletedOverlay(true);
                        if (selectedContact) {
                          setDeletedContacts(prev => [...prev, selectedContact]);
                          setContacts(prev =>
                            prev.filter(c => c.id !== selectedContact.id)
                          );
                          setShowContactDetails(false);
                        }
                        setMenuOpen(false);
                        setContactMenuOpen(false);
                      }}
                    >
                      Deleted
                    </div>
                  </>
                )}
              </div>
            )}
            <button className="add-contact-btn" onClick={() => setShowAddContact(true)}>
              +
            </button>
            {contacts.length === 0 && <p>No contacts</p>}
            {Object.entries(
              contacts.reduce((acc, c) => {
                const letter = c.name[0].toUpperCase();
                acc[letter] = acc[letter] || [];
                acc[letter].push(c);
                return acc;
              }, {})
            ).map(([letter, list]) => (
              <div key={letter}>
                <h4 className="alpha-label">{letter}</h4>
                {list.map(c => (
                  <div key={c.id} 
                    className="contact-item" 
                    onClick={() => {
                    setSelectedContact(c);
                    setShowContactDetails(true);
                  }}>
                    <div className="pof">
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="contact-name">{c.name}</div>
                    {blockedContacts.some(b => b.id === c.id) && (
                      <span className="blocked-tag">Blocked</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {activeTab === "favourites" && (
          <div className="fav page">
            {favourites.length === 0 && <p>No favourites</p>}
            {Object.entries(
              favourites.reduce((acc, c) => {
                const letter = c.name[0].toUpperCase();
                acc[letter] = acc[letter] || [];
                acc[letter].push(c);
                return acc;
              }, {})
            ).map(([letter, list]) => (
              <div key={letter}>
                <h4 className="alpha-label">{letter}</h4>

                {list.map(c => (
                  <div
                    key={c.id}
                    className="contact-item"
                    onClick={() => {
                      setSelectedContact(c);
                      setShowContactDetails(true);
                    }}
                  >
                    <div className="pof">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="contact-name">{c.name}</div>
                  </div>
                ))}
              </div>
            ))}

          </div>
        )}
      </div>
      {showAddContact && (
        <div className="add-contact-overlay">
          <div className="add-contact-header">
            <span className="close" onClick={() => setShowAddContact(false)}>✕</span>
            <h2>{isEditing ? "Edit" : "New contact"}</h2>
            <span
              className={`save ${contactName && contactPhone ? "active" : ""}`}
              onClick={handleSaveContact}
            >
              ✓
            </span>
          </div>
          <div className="add-contact-form">
            <h2>Name</h2>
            <input
              type="text"
              placeholder="Name"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
            />
            <h2>Phone</h2>
            <input
              type="tel"
              placeholder="Phone number"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
            <h2>Email</h2>
            <input
              type="email"
              placeholder="Email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
            />
            <div className="save-to-wrapper">
              <div
                className="save-to-text"
                onClick={() => setShowSaveOptions(prev => !prev)}
              >
                Save to
              </div>
              {!showSaveOptions && (
                <div className="save-to-selected">
                  {saveTo === "phone" ? "Phone" : "SIM 1"}
                </div>
              )}
              {showSaveOptions && (
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={saveTo === "phone"}
                      onChange={() => setSaveTo("phone")}
                    />
                    Phone
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={saveTo === "sim1"}
                      onChange={() => setSaveTo("sim1")}
                    />
                    SIM 1
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showContactDetails && selectedContact && (
        <div className="contact-details-overlay">
          <div className="contact-top">
            <div className="contact-top-bar">
              <span className='back'onClick={() => {setShowContactDetails(false); setShowContactMenu(false); }}>‹</span>
              <div className="right-icons">
                <span
                  onClick={() => {
                    toggleFavourite(selectedContact)
                    const exists = favourites.find(f => f.id === selectedContact.id);
                    if (exists) {
                      setFavourites(prev => prev.filter(f => f.id !== selectedContact.id));
                    } else {
                      setFavourites(prev => [...prev, selectedContact]);
                    }
                  }}
                >
                  {favourites.find(f => f.id === selectedContact.id) ? "★" : "☆"}
                </span>
                <span
                  onClick={() => {
                    setIsEditing(true);
                    setContactName(selectedContact.name);
                    setContactPhone(selectedContact.phone);
                    setContactEmail(selectedContact.email);
                    setShowAddContact(true);
                    setShowContactDetails(false);
                  }}
                >
                  ✎
                </span>
                <span onClick={() => setShowContactMenu(prev => !prev)}>⋮</span>
              </div>
            </div>
            <div className="contact-profile">
              <div className="big-pof">
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <h2>{selectedContact.name}</h2>
            </div>
            {showContactMenu && (
              <div className="contact-menu">
                <div
                  onClick={() => {
                    setShowContactMenu(false); 
                  }}
                >
                  Share contact
                </div>
                <div
                  onClick={() => {
                    toggleBlock(selectedContact);
                    setShowContactMenu(false);
                  }}
                >
                  {blockedContacts.some(b => b.id === selectedContact.id)
                    ? "Unblock"
                    : "Block"}
                </div>
                <div
                  onClick={() => {
                    deleteContact(selectedContact);
                    setShowContactDetails(false);
                    setShowContactMenu(false);
                  }}
                >
                  Delete
                </div>
              </div>
            )}
          </div>
          <div className="contact-bottom">
            <div className="quick-actions">
              <div
                className="voice-call"
                onClick={async () => {
                  if (!selectedContact?.phone) return;

                  const newCall = {
                    number: selectedContact.phone,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  };

                  try {
                    const res = await fetch("/api/calls", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newCall)
                    });
                    const savedCall = await res.json(); // returned from backend with id
                    setCallHistory(prev => [savedCall, ...prev]); // update frontend state
                  } catch (err) {
                    console.error("Failed to save call", err);
                  }

                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#464646ff">
                  <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.21c1.21.48 2.53.74 3.88.74a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1C9.94 22 2 14.06 2 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.35.26 2.67.74 3.88a1 1 0 0 1-.21 1.11l-2.2 2.2z"/>
                </svg>
                <span>{selectedContact.phone}</span>
              </div>
              <div className='both'>
                <div>🎥</div>
                <div>💬</div>
              </div>
            </div>
            <div className="contact-actions">
              <div>Voice call <span>{selectedContact.phone}</span></div>
              <div>Video call <span>{selectedContact.phone}</span></div>
              <div>Message <span>{selectedContact.phone}</span></div>
              <div>Video call on Meet <span>{selectedContact.phone}</span></div>
            </div>
          </div>
        </div>
      )}
      {showDeletedOverlay && (
        <div className="deleted-overlay">
          <div className="deleted-header">
            <span className="back" onClick={() => {
              setShowDeletedOverlay(false);
              setActiveDeletedId(null);
            }}>
              ‹
            </span>
            <h2>Deleted contacts</h2>
          </div>
          <div className="deleted-list">
            {deletedContacts.length === 0 && <p>No deleted contacts</p>}
            {deletedContacts.map(c => (
              <div key={c.id} className="deleted-row">
                <div
                  className="deleted-item"
                  onClick={() =>
                    setActiveDeletedId(
                      activeDeletedId === c.id ? null : c.id
                    )
                  }
                >
                  <div className="pof">{c.name[0]}</div>
                  <span>{c.name}</span>
                </div>
                {activeDeletedId === c.id && (
                  <div
                    className="restore-inline"
                    onClick={() => {
                      restoreContact(c.id);
                      setActiveDeletedId(null);
                    }}
                  >
                    Restore
                  </div>
                )}

              </div>
            ))}
          </div>

        </div>
      )}
      {showBlockedOverlay && (
        <div className="blocked-overlay">
          <div className="blocked-header">
            <span
              className="back"
              onClick={() => {
                setShowBlockedOverlay(false);
                setActiveBlockedId(null);
              }}
            >
              ‹
            </span>
            <h2>Blocked contacts</h2>
          </div>
          <div className="blocked-list">
            {blockedContacts.length === 0 && <p>No blocked contacts</p>}
            {blockedContacts.map(c => (
              <div
                key={c.id}
                className="contact-item"
                onClick={() =>
                  setActiveBlockedId(
                    activeBlockedId === c.id ? null : c.id
                  )
                }
              >
                <div className="pof">{c.name[0]}</div>
                <div className="contact-name">{c.name}</div>
                {activeBlockedId === c.id && (
                  <div
                    className="inline-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBlock(c); 
                      setActiveBlockedId(null);
                    }}

                  >
                    Unblock
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <footer>
        <ul>
          <li>
            <a href="#dial" onClick={() => setActiveTab("dial")}>
              <span className={`one nav-item ${activeTab === "dial" ? "active" : ""}`}>
                <span className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#464646ff">
                    <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.21c1.21.48 2.53.74 3.88.74a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1C9.94 22 2 14.06 2 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.35.26 2.67.74 3.88a1 1 0 0 1-.21 1.11l-2.2 2.2z"/>
                  </svg>
                </span>
                <span className="label">Dial</span>
              </span>
            </a>
          </li>
          <li>
            <a href="#cont" onClick={() => setActiveTab("contacts")}>
              <span className={`two nav-item ${activeTab === "contacts" ? "active" : ""}`}>
                <span className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#464646ff">
                    <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
                  </svg>
                </span>
                <span className="label">Contacts</span>
              </span>
            </a>
          </li>
          <li>
            <a onClick={() => setActiveTab("favourites")}>
              <span className={`three nav-item ${activeTab === "favourites" ? "active" : ""}`}>
                <span className="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#464646ff">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </span>
                <span className="label">Favourites</span>
              </span>
            </a>
          </li>
        </ul>
      </footer>
    </>
  )
}

export default App
