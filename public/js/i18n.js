// CampusRide — Multi-lingual Localization System (English, Marathi, Hindi)
// Supports direct t() lookups and automatic recursive DOM translation

const DICTIONARY = {
  mr: {
    // Navigation & Common Actions
    "Back": "मागे (Back)",
    "Go Back": "मागे जा",
    "Home": "मुख्यपृष्ठ",
    "Scan": "स्कॅन",
    "Map": "नकाशा",
    "Contacts": "संपर्क",
    "Settings": "सेटिंग्ज",
    "Sign In": "साइन इन करा",
    "Sign out": "बाहेर पडा",
    "Log In": "लॉगिन करा",
    "Log Out": "लॉग आउट",
    "Register": "नोंदणी करा",
    "Forgot?": "विसरलात?",
    "Verifying...": "पडताळणी करत आहे...",
    "Submitting...": "सादर करत आहे...",
    "Processing...": "प्रक्रिया सुरू आहे...",
    "Saving...": "जतन करत आहे...",
    "Save": "जतन करा",
    "Cancel": "रद्द करा",
    "Close": "बंद करा",
    "Delete": "हटवा",
    "Remove": "काढून टाका",

    // Roles & Badges
    "CampusRide": "कॅम्पसराईड",
    "Secure Campus Transportation Management": "सुरक्षित कॅम्पस वाहतूक व्यवस्थापन",
    "Admin": "अॅडमिन",
    "Staff (Gate)": "गेट कर्मचारी",
    "Staff": "कर्मचारी",
    "Driver": "चालक (ड्रायव्हर)",
    "Parent": "पालक",
    "Pending Staff": "प्रलंबित कर्मचारी",
    "Verified": "सत्यापित",
    "✓ Verified": "✓ सत्यापित",
    "Locked": "लॉक केलेले",
    "✓ Acquired & Locked": "✓ प्राप्त आणि लॉक केले",
    "Inside Campus": "कॅम्पसच्या आत",
    "Outside": "कॅम्पसच्या बाहेर",
    "Active": "सक्रिय",
    "Pending": "प्रलंबित",
    "Approved": "मंजूर",
    "Rejected": "नाकारले",
    "ADMIN": "अॅडमिन",

    // Registration & Auth
    "New to CampusRide? Choose registration:": "कॅम्पसराईडवर नवीन आहात? नोंदणी निवडा:",
    "Gate Staff Onboarding": "गेट कर्मचारी नोंदणी",
    "Driver Registration": "चालक नोंदणी",
    "Parent Registration": "पालक नोंदणी",
    "Reset Password": "पासवर्ड रीसेट करा",
    "Full Name (First and Last)": "पूर्ण नाव (पहिले आणि आडनाव)",
    "Full Driver Name": "चालकाचे पूर्ण नाव",
    "Full Parent / Guardian Name": "पालकाचे पूर्ण नाव",
    "Email Address": "ईमेल पत्ता",
    "Phone Number (10 Digits)": "फोन नंबर (१० अंक)",
    "Mobile Phone (10 Digits)": "मोबाईल फोन (१० अंक)",
    "Vehicle License Plate (e.g. MH 31 DC 9633)": "वाहन क्रमांक प्लेट (उदा. MH 31 DC 9633)",
    "Vehicle License Plate (Number)": "वाहन क्रमांक प्लेट",
    "Vehicle License Plate": "वाहन क्रमांक प्लेट",
    "Vehicle Type": "वाहनाचा प्रकार",
    "Password (Min 6 chars)": "पासवर्ड (किमान ६ अक्षरे)",
    "Password": "पासवर्ड",
    "Confirm Password": "पासवर्ड पुष्टी करा",
    "Send OTP": "OTP पाठवा",
    "Resend OTP": "OTP पुन्हा पाठवा",
    "Verify Code": "कोड सत्यापित करा",
    "Enter 6-Digit Email OTP:": "६-अंकी ईमेल OTP टाका:",
    "Submit Request for Approval": "मंजुरीसाठी विनंती सादर करा",
    "Complete Driver Registration": "चालक नोंदणी पूर्ण करा",
    "Create Parent Account": "पालक खाते तयार करा",
    "Already have an account?": "आधीच खाते आहे का?",
    "Already registered?": "आधीच नोंदणी झाली आहे का?",
    "Return to Login": "लॉगिनवर परत जा",
    "Automatic Live Pickup GPS": "स्वयंचलित थेट GPS स्थान",
    "Live Pickup Location (Automatic)": "थेट पिकअप स्थान (स्वयंचलित)",

    // Gate Operations Center
    "Gate Operations Center": "गेट ऑपरेशन्स केंद्र",
    "Gate 1 Dispatch & Entry/Exit Control": "गेट १ डिस्पॅच आणि प्रवेश/निर्गमन नियंत्रण",
    "Open Gate Scanner": "गेट स्कॅनर उघडा",
    "Register Driver / Staff": "चालक / कर्मचारी नोंदणी",
    "Inside Campus Now": "आता कॅम्पसमध्ये उपस्थित",
    "Today's Entries": "आजचे एकूण प्रवेश",
    "Today's Exits": "आजचे एकूण निर्गमन",
    "vehicles active": "वाहने सक्रिय",
    "logged": "नोंदवले",
    "Pass Scanner": "पास स्कॅनर",
    "Daily Log Register": "दैनिक नोंदवही",
    "Fleet on Google Maps": "Google Maps वर वाहने",
    "Recent Gate Activity Log": "अलीकडील गेट हालचाली नोंद",
    "View Complete Register →": "संपूर्ण नोंदवही पहा →",
    "View Complete Register": "संपूर्ण नोंदवही पहा",

    // Dual-Mode Registration
    "Gate Registration: Drivers & Staff": "गेट नोंदणी: चालक आणि कर्मचारी",
    "Mode 1: Scan QR Code": "मोड १: QR कोड स्कॅन करा",
    "Mode 2: Fill Details (Manual)": "मोड २: तपशील भरा (मॅन्युअल)",
    "Campus Van Pass": "कॅम्पस व्हॅन पास",
    "Staff Vehicle Pass": "कर्मचारी वाहन पास",
    "Scan Van Registration QR": "व्हॅन नोंदणी QR स्कॅन करा",
    "Scan Staff Pass QR": "कर्मचारी पास QR स्कॅन करा",
    "Open Camera Scanner": "कॅमेरा स्कॅनर उघडा",
    "Add New Campus Van": "नवीन कॅम्पस व्हॅन जोडा",
    "Add Staff Vehicle Pass": "कर्मचारी वाहन पास जोडा",
    "Driver / Staff Full Name": "चालक / कर्मचारी पूर्ण नाव",
    "Name (Driver / Staff)": "नाव (चालक / कर्मचारी)",
    "Register & Issue Pass": "नोंदणी करा आणि पास जारी करा",
    "Create & Issue Pass": "पास तयार करा आणि जारी करा",
    "✍️ Fill Details": "✍️ तपशील भरा",
    "📷 Scan QR Code": "📷 QR कोड स्कॅन करा",

    // Driver Console
    "Driver Console": "चालक नियंत्रण कक्ष",
    "START JOURNEY": "प्रवास सुरू करा (START)",
    "END JOURNEY": "प्रवास समाप्त करा (END)",
    "GPS BROADCASTING LIVE": "GPS थेट प्रक्षेपण सुरू (LIVE)",
    "VEHICLE IDLE (NOT TRACKING)": "वाहन स्थिर (ट्रॅकिंग बंद)",
    "Assigned Student Stops": "नेमलेले विद्यार्थी थांबे",
    "Open in Google Maps": "Google Maps वर उघडा",
    "Turn-by-Turn Navigation": "मार्ग नेव्हिगेशन (Google Maps)",

    // Parent Dashboard
    "Tracking:": "ट्रॅक करत आहे:",
    "BUS ACTIVE & EN ROUTE": "व्हॅन सुरू आहे आणि मार्गावर आहे",
    "BUS AT REST / IDLE": "व्हॅन थांबलेली आहे",
    "My Children": "माझी मुले",
    "+ Add Child": "+ मूल जोडा",
    "Transit Notifications": "वाहतूक सूचना",
    "Mark Read": "वाचले म्हणून चिन्हांकित करा",

    // Live Map & Google Maps
    "Live Fleet Tracking": "थेट वाहन ताफा ट्रॅकिंग",
    "Open Fleet on Google Maps": "सर्व वाहने Google Maps वर पहा",
    "Active Transport Vehicles": "सक्रिय वाहतूक वाहने",
    "View": "पहा",
    "in Google Maps": "Google Maps वर",

    // Registry & Admin
    "Vans & Staff Registry": "व्हॅन आणि कर्मचारी नोंदवही",
    "Add Campus Van": "कॅम्पस व्हॅन जोडा",
    "Add Staff Pass": "कर्मचारी पास जोडा",
    "View QR Pass": "QR पास पहा",
    "Print Pass Card": "पास कार्ड प्रिंट करा",
    "Campus Transit Pass": "कॅम्पस वाहतूक पास",
    "Staff Approvals & Gate Audit": "कर्मचारी मंजुरी आणि गेट तपासणी",
    "Staff Authorization Management": "कर्मचारी अधिकृतता व्यवस्थापन",
    "✓ Approve Access": "✓ प्रवेश मंजूर करा",
    "✕ Reject": "✕ नाकारा",
    "⭐ Promote to Admin": "⭐ अॅडमिन बनवा",
    "🚫 Block / Delete Staff": "🚫 कर्मचारी ब्लॉक करा",
    "View Gate Register": "गेट नोंदवही पहा",

    // Directories & Settings
    "Campus Directories": "कॅम्पस संपर्क निर्देशिका",
    "Gate & Security Staff": "गेट आणि सुरक्षा कर्मचारी",
    "Parent Accounts & Addresses": "पालक खाती आणि पत्ते",
    "📞 Call": "📞 कॉल करा",
    "Call": "कॉल करा",
    "🗺️ Google Maps": "🗺️ Google Maps",
    "Directions": "मार्ग",
    "Settings & Preferences": "सेटिंग्ज आणि प्राधान्ये",
    "Language / भाषा": "भाषा / Language",
    "Home Pickup Address & Location": "पिकअप पत्ता आणि स्थान",
    "Re-Detect Live GPS Location": "थेट GPS पुन्हा शोधा",
    "Save Location Changes": "स्थान बदल जतन करा",
    "Install App (PWA)": "अॅप इन्स्टॉल करा",
    "Add to Home Screen": "होम स्क्रीनवर जोडा",
    "Danger Zone — Delete Account": "खाते हटवा (धोकादायक)",
    "Permanently Delete My Account": "माझे खाते कायमचे हटवा"
  },

  hi: {
    // Navigation & Common Actions
    "Back": "वापस (Back)",
    "Go Back": "वापस जाएं",
    "Home": "होम",
    "Scan": "स्कैन",
    "Map": "मैप",
    "Contacts": "संपर्क",
    "Settings": "सेटिंग्स",
    "Sign In": "साइन इन करें",
    "Sign out": "लॉग आउट",
    "Log In": "लॉग इन करें",
    "Log Out": "लॉग आउट",
    "Register": "पंजीकरण करें",
    "Forgot?": "भूल गए?",
    "Verifying...": "सत्यापित कर रहे हैं...",
    "Submitting...": "जमा कर रहे हैं...",
    "Processing...": "प्रक्रिया जारी है...",
    "Saving...": "सहेज रहे हैं...",
    "Save": "सहेजें",
    "Cancel": "रद्द करें",
    "Close": "बंद करें",
    "Delete": "हटाएं",
    "Remove": "हटाएं",

    // Roles & Badges
    "CampusRide": "कैम्पसराइड",
    "Secure Campus Transportation Management": "सुरक्षित परिसर परिवहन प्रबंधन",
    "Admin": "एडमिन",
    "Staff (Gate)": "गेट कर्मचारी",
    "Staff": "कर्मचारी",
    "Driver": "चालक (ड्राइवर)",
    "Parent": "अभिभावक (पैरेंट)",
    "Pending Staff": "लंबित कर्मचारी",
    "Verified": "सत्यापित",
    "✓ Verified": "✓ सत्यापित",
    "Locked": "लॉक",
    "✓ Acquired & Locked": "✓ प्राप्त एवं लॉक",
    "Inside Campus": "परिसर के अंदर",
    "Outside": "परिसर के बाहर",
    "Active": "सक्रिय",
    "Pending": "लंबित",
    "Approved": "स्वीकृत",
    "Rejected": "अस्वीकृत",
    "ADMIN": "एडमिन",

    // Registration & Auth
    "New to CampusRide? Choose registration:": "कैम्पसराइड पर नए हैं? पंजीकरण चुनें:",
    "Gate Staff Onboarding": "गेट कर्मचारी पंजीकरण",
    "Driver Registration": "ड्राइवर पंजीकरण",
    "Parent Registration": "अभिभावक पंजीकरण",
    "Reset Password": "पासवर्ड रीसेट करें",
    "Full Name (First and Last)": "पूरा नाम (पहला एवं अंतिम)",
    "Full Driver Name": "ड्राइवर का पूरा नाम",
    "Full Parent / Guardian Name": "अभिभावक का पूरा नाम",
    "Email Address": "ईमेल पता",
    "Phone Number (10 Digits)": "फ़ोन नंबर (10 अंक)",
    "Mobile Phone (10 Digits)": "मोबाइल फ़ोन (10 अंक)",
    "Vehicle License Plate (e.g. MH 31 DC 9633)": "वाहन नंबर प्लेट (उदा. MH 31 DC 9633)",
    "Vehicle License Plate (Number)": "वाहन लाइसेंस प्लेट",
    "Vehicle License Plate": "वाहन नंबर प्लेट",
    "Vehicle Type": "वाहन का प्रकार",
    "Password (Min 6 chars)": "पासवर्ड (न्यूनतम 6 अक्षर)",
    "Password": "पासवर्ड",
    "Confirm Password": "पासवर्ड की पुष्टि करें",
    "Send OTP": "OTP भेजें",
    "Resend OTP": "OTP पुनः भेजें",
    "Verify Code": "कोड सत्यापित करें",
    "Enter 6-Digit Email OTP:": "6-अंकीय ईमेल OTP दर्ज करें:",
    "Submit Request for Approval": "स्वीकृति के लिए अनुरोध भेजें",
    "Complete Driver Registration": "ड्राइवर पंजीकरण पूरा करें",
    "Create Parent Account": "अभिभावक खाता बनाएं",
    "Already have an account?": "क्या पहले से खाता है?",
    "Already registered?": "क्या पहले से पंजीकृत हैं?",
    "Return to Login": "लॉगिन पर वापस जाएं",
    "Automatic Live Pickup GPS": "स्वचालित लाइव पिकअप GPS",
    "Live Pickup Location (Automatic)": "लाइव पिकअप स्थान (स्वचालित)",

    // Gate Operations Center
    "Gate Operations Center": "गेट संचालन केंद्र",
    "Gate 1 Dispatch & Entry/Exit Control": "गेट 1 डिस्पैच एवं प्रवेश/निकास नियंत्रण",
    "Open Gate Scanner": "गेट स्कैनर खोलें",
    "Register Driver / Staff": "ड्राइवर / कर्मचारी पंजीकरण",
    "Inside Campus Now": "परिसर में वर्तमान वाहन",
    "Today's Entries": "आज के कुल प्रवेश",
    "Today's Exits": "आज के कुल निकास",
    "vehicles active": "वाहन सक्रिय",
    "logged": "दर्ज",
    "Pass Scanner": "पास स्कैनर",
    "Daily Log Register": "दैनिक लॉग रजिस्टर",
    "Fleet on Google Maps": "Google Maps पर वाहन",
    "Recent Gate Activity Log": "हालिया गेट गतिविधि",
    "View Complete Register →": "पूरा रजिस्टर देखें →",
    "View Complete Register": "पूरा रजिस्टर देखें",

    // Dual-Mode Registration
    "Gate Registration: Drivers & Staff": "गेट पंजीकरण: ड्राइवर एवं कर्मचारी",
    "Mode 1: Scan QR Code": "मोड 1: QR कोड स्कैन करें",
    "Mode 2: Fill Details (Manual)": "मोड 2: विवरण भरें (मैनुअल)",
    "Campus Van Pass": "कैम्पस वैन पास",
    "Staff Vehicle Pass": "कर्मचारी वाहन पास",
    "Scan Van Registration QR": "वैन पंजीकरण QR स्कैन करें",
    "Scan Staff Pass QR": "कर्मचारी पास QR स्कैन करें",
    "Open Camera Scanner": "कैमरा स्कैनर खोलें",
    "Add New Campus Van": "नई कैम्पस वैन जोड़ें",
    "Add Staff Vehicle Pass": "कर्मचारी वाहन पास जोड़ें",
    "Driver / Staff Full Name": "ड्राइवर / कर्मचारी का पूरा नाम",
    "Name (Driver / Staff)": "नाम (ड्राइवर / कर्मचारी)",
    "Register & Issue Pass": "पंजीकरण करें एवं पास जारी करें",
    "Create & Issue Pass": "पास बनाएं एवं जारी करें",
    "✍️ Fill Details": "✍️ विवरण भरें",
    "📷 Scan QR Code": "📷 QR कोड स्कैन करें",

    // Driver Console
    "Driver Console": "ड्राइवर कंट्रोल कंसोल",
    "START JOURNEY": "यात्रा प्रारंभ करें (START)",
    "END JOURNEY": "यात्रा समाप्त करें (END)",
    "GPS BROADCASTING LIVE": "GPS लाइव प्रसारण सक्रिय (LIVE)",
    "VEHICLE IDLE (NOT TRACKING)": "वाहन निष्क्रिय (ट्रैकिंग बंद)",
    "Assigned Student Stops": "आवंटित छात्र स्टॉप",
    "Open in Google Maps": "Google Maps पर खोलें",
    "Turn-by-Turn Navigation": "टर्न-बाय-टर्न नेविगेशन (Google Maps)",

    // Parent Dashboard
    "Tracking:": "ट्रैकिंग:",
    "BUS ACTIVE & EN ROUTE": "वैन सक्रिय एवं मार्ग पर है",
    "BUS AT REST / IDLE": "वैन रुकी हुई है",
    "My Children": "मेरे बच्चे",
    "+ Add Child": "+ बच्चा जोड़ें",
    "Transit Notifications": "परिवहन सूचनाएं",
    "Mark Read": "पढ़ा हुआ चिह्नित करें",

    // Live Map & Google Maps
    "Live Fleet Tracking": "लाइव फ्लीट ट्रैकिंग",
    "Open Fleet on Google Maps": "सभी वाहन Google Maps पर देखें",
    "Active Transport Vehicles": "सक्रिय परिवहन वाहन",
    "View": "देखें",
    "in Google Maps": "Google Maps पर",

    // Registry & Admin
    "Vans & Staff Registry": "वैन एवं कर्मचारी रजिस्टर",
    "Add Campus Van": "कैम्पस वैन जोड़ें",
    "Add Staff Pass": "कर्मचारी पास जोड़ें",
    "View QR Pass": "QR पास देखें",
    "Print Pass Card": "पास कार्ड प्रिंट करें",
    "Campus Transit Pass": "कैम्पस परिवहन पास",
    "Staff Approvals & Gate Audit": "कर्मचारी स्वीकृति एवं गेट ऑडिट",
    "Staff Authorization Management": "कर्मचारी प्राधिकरण प्रबंधन",
    "✓ Approve Access": "✓ पहुंच स्वीकृत करें",
    "✕ Reject": "✕ अस्वीकार करें",
    "⭐ Promote to Admin": "⭐ एडमिन बनाएं",
    "🚫 Block / Delete Staff": "🚫 कर्मचारी ब्लॉक करें",
    "View Gate Register": "गेट रजिस्टर देखें",

    // Directories & Settings
    "Campus Directories": "परिसर संपर्क निर्देशिका",
    "Gate & Security Staff": "गेट एवं सुरक्षा कर्मचारी",
    "Parent Accounts & Addresses": "अभिभावक खाते एवं पते",
    "📞 Call": "📞 कॉल करें",
    "Call": "कॉल करें",
    "🗺️ Google Maps": "🗺️ Google Maps",
    "Directions": "दिशा-निर्देश",
    "Settings & Preferences": "सेटिंग्स एवं प्राथमिकताएं",
    "Language / भाषा": "भाषा / Language",
    "Home Pickup Address & Location": "पिकअप पता एवं स्थान",
    "Re-Detect Live GPS Location": "लाइव GPS पुनः खोजें",
    "Save Location Changes": "स्थान परिवर्तन सहेजें",
    "Install App (PWA)": "ऐप इंस्टॉल करें",
    "Add to Home Screen": "होम स्क्रीन पर जोड़ें",
    "Danger Zone — Delete Account": "खाता हटाएं (खतरे का क्षेत्र)",
    "Permanently Delete My Account": "मेरा खाता स्थायी रूप से हटाएं"
  }
};

class I18nSystem {
  constructor() {
    this.currentLang = localStorage.getItem('campusride_lang') || 'en';
  }

  get lang() {
    return this.currentLang;
  }

  setLanguage(lang) {
    if (['en', 'mr', 'hi'].includes(lang)) {
      this.currentLang = lang;
      localStorage.setItem('campusride_lang', lang);
      window.dispatchEvent(new CustomEvent('campusride_lang_change', { detail: lang }));
      this.translateDOM();
    }
  }

  t(str) {
    if (!str || typeof str !== 'string') return str;
    if (this.currentLang === 'en') return str;
    const dict = DICTIONARY[this.currentLang];
    if (dict && dict[str]) {
      return dict[str];
    }
    return str;
  }

  // Automatic DOM text translator
  translateDOM(root = document.body) {
    if (this.currentLang === 'en') return;
    const dict = DICTIONARY[this.currentLang];
    if (!dict) return;

    // 1. Translate all text nodes
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_SKIP;
          const tag = parent.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'textarea' || parent.isContentEditable) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToReplace = [];
    while (walker.nextNode()) {
      nodesToReplace.push(walker.currentNode);
    }

    nodesToReplace.forEach(node => {
      const rawText = node.nodeValue.trim();
      if (dict[rawText]) {
        node.nodeValue = node.nodeValue.replace(rawText, dict[rawText]);
      } else {
        // Try substring replacement for common known key phrases
        for (const [enKey, trVal] of Object.entries(dict)) {
          if (rawText === enKey || (enKey.length > 5 && rawText.includes(enKey))) {
            node.nodeValue = node.nodeValue.replace(enKey, trVal);
          }
        }
      }
    });

    // 2. Translate placeholders & titles
    root.querySelectorAll('input[placeholder], button[title], select').forEach(el => {
      const ph = el.getAttribute('placeholder');
      if (ph && dict[ph.trim()]) {
        el.setAttribute('placeholder', dict[ph.trim()]);
      }
      const title = el.getAttribute('title');
      if (title && dict[title.trim()]) {
        el.setAttribute('title', dict[title.trim()]);
      }
    });
  }
}

window.i18n = new I18nSystem();
window.t = (str) => window.i18n.t(str);

// Global back navigation helper (§4)
window.goBack = function() {
  const hash = window.location.hash || '';
  if (hash.startsWith('#/register') || hash.startsWith('#/forgot')) {
    window.location.hash = '#/login';
  } else if (hash === '#/' || hash === '' || hash === '#') {
    // Already on home
  } else {
    window.location.hash = '#/';
  }
};
