const toggle = document.querySelector(".menu-toggle");
const links = document.querySelector(".nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  });
  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Ouvrir le menu");
    });
  });
}

document.querySelectorAll(".contact-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const feedback = form.querySelector(".form-feedback");
    const button = form.querySelector("button[type=\"submit\"]");
    if (button) button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch("https://formspree.io/f/mppzngoy", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Le message n’a pas pu être envoyé. Réessayez plus tard.");
      }
      if (feedback) {
        feedback.textContent = "Merci pour votre message. Nous vous répondrons rapidement.";
        feedback.hidden = false;
      }
      form.reset();
    } catch (error) {
      feedbackMessage(feedback, error.message);
    } finally {
      if (button) button.disabled = false;
    }
  });
});

const paymentForm = document.querySelector("#payment-form");
if (paymentForm) {
  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const feedback = paymentForm.querySelector(".form-feedback");
    feedback.textContent = "Votre choix est enregistré. Le paiement réel sera activé lorsque le prestataire sera connecté.";
    feedback.hidden = false;
  });
}

const hero = document.querySelector(".hero-home");
const seasonCard = document.querySelector(".season-card");
const heroSide = document.querySelector(".hero-side");
if (hero && seasonCard && window.matchMedia("(pointer: fine)").matches) {
  seasonCard.addEventListener("mouseenter", () => heroSide?.classList.add("card-focus"));
  seasonCard.addEventListener("mouseleave", () => heroSide?.classList.remove("card-focus"));
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (event.target.closest(".season-card")) {
      seasonCard.style.transform = `scale(1.16) rotate(3deg) rotateY(${x * 7}deg) rotateX(${y * -7}deg)`;
    } else {
      seasonCard.style.removeProperty("transform");
    }
  });
  hero.addEventListener("pointerleave", () => {
    seasonCard.style.removeProperty("transform");
    heroSide?.classList.remove("card-focus");
  });
}

const apiBase = new URL("api/", document.baseURI).href;
const apiRequest = async (endpoint, options = {}) => {
  if (window.location.protocol === "file:") {
    throw new Error("Le site doit être ouvert avec http://localhost/Site-Yann/ après avoir démarré Apache dans XAMPP.");
  }
  const request = { credentials: "include", ...options, headers: { ...(options.headers || {}) } };
  if (request.body && typeof request.body !== "string") {
    request.body = JSON.stringify(request.body);
  }
  if (request.body) request.headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(`${apiBase}${endpoint}`, request);
  } catch {
    throw new Error("Impossible de joindre PHP. Démarrez Apache et MySQL dans XAMPP, puis ouvrez http://localhost/Site-Yann/.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error?.message || "Le serveur est indisponible.");
    error.code = payload.error?.code;
    throw error;
  }
  return payload;
};
const feedbackMessage = (element, message) => {
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
};
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[character]));

(async () => {
  document.querySelectorAll("[data-auth-status]").forEach(async (element) => {
    try {
      const response = await apiRequest("me.php");
      const language = document.documentElement.lang;
      const loggedIn = language === "en" ? "Logged in" : language === "es" ? "Sesión iniciada" : "Connecté";
      const login = language === "en" ? "Create an account / Log in" : language === "es" ? "Crear una cuenta / Iniciar sesión" : "Créer un compte / Se connecter";
      element.textContent = response.authenticated ? `${loggedIn}: ${response.user.email}` : login;
    } catch {
      const language = document.documentElement.lang;
      element.textContent = language === "en" ? "Create an account / Log in" : language === "es" ? "Crear una cuenta / Iniciar sesión" : "Créer un compte / Se connecter";
    }
  });

  const accountTitle = document.querySelector("[data-create-label][data-account-label]");
  const accountLinks = document.querySelectorAll("[data-account-link]");
  if (accountTitle || accountLinks.length) {
    const setAccountLabels = (authenticated) => {
      if (accountTitle) {
        accountTitle.textContent = authenticated
          ? accountTitle.dataset.accountLabel
          : accountTitle.dataset.createLabel;
      }
      accountLinks.forEach((link) => {
        link.textContent = authenticated ? link.dataset.accountLabel : link.dataset.createLabel;
      });
    };
    try {
      const response = await apiRequest("me.php");
      setAccountLabels(response.authenticated);
    } catch {
      setAccountLabels(false);
    }
  }

  const accountForm = document.querySelector("#account-form");
  if (accountForm) {
    const feedback = accountForm.querySelector(".form-feedback");
    accountForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(accountForm));
      try {
        const response = await apiRequest("register.php", { method: "POST", body: data });
        const verificationModal = document.querySelector("#verification-modal");
        verificationModal.querySelector("[name=email]").value = data.email;
        verificationModal.hidden = false;
        document.body.classList.add("modal-open");
        const devCode = response.development?.verification_code;
        feedbackMessage(feedback, devCode
          ? `Compte créé. Code de développement : ${devCode}`
          : "Compte créé. Vérifiez maintenant votre adresse email.");
      } catch (error) {
        feedbackMessage(feedback, error.message);
      }
    });
  }

  const verificationForm = document.querySelector("#verification-form");
  if (verificationForm) {
    const feedback = verificationForm.querySelector(".form-feedback");
    verificationForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(verificationForm));
      try {
        await apiRequest("verify-email.php", {
          method: "POST",
          body: { email: data.email, code: data.verificationCode }
        });
        document.querySelector("#verification-modal").hidden = true;
        document.body.classList.remove("modal-open");
        feedbackMessage(feedback, "Adresse vérifiée. Vous pouvez maintenant vous connecter.");
        setTimeout(() => { window.location.href = "connexion.html"; }, 500);
      } catch (error) {
        feedbackMessage(feedback, error.message);
      }
    });
  }

  const loginForm = document.querySelector("#login-form");
  if (loginForm) {
    const feedback = loginForm.querySelector(".form-feedback");
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(loginForm));
      try {
        await apiRequest("login.php", { method: "POST", body: data });
        feedbackMessage(feedback, "Connexion réussie.");
        setTimeout(() => { window.location.href = "compte.html"; }, 500);
      } catch (error) {
        feedbackMessage(feedback, error.message);
      }
    });
  }

  const accountDashboard = document.querySelector("#account-dashboard");
  if (accountDashboard) {
    const authCard = document.querySelector("#auth-card");
    try {
      const me = await apiRequest("me.php");
      if (!me.authenticated) return;
      const user = me.user;
      authCard.hidden = true;
      accountDashboard.hidden = false;
      document.querySelector("#account-name").textContent = user.name || user.email;
      const profileForm = document.querySelector("#profile-form");
      const address = me.addresses?.[0] || {};
      const profileValues = {
        oldEmail: user.email, email: user.email, name: user.name || "", phone: user.phone || "",
        streetNumber: address.street_number || "", street: address.street || "",
        postalCode: address.postal_code || "", city: address.city || "", country: address.country || "France"
      };
      Object.entries(profileValues).forEach(([key, value]) => {
        if (profileForm.elements[key]) profileForm.elements[key].value = value;
      });
      profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const feedback = document.querySelector("#profile-feedback");
        try {
          const response = await apiRequest("profile.php", {
            method: "PUT",
            body: Object.fromEntries(new FormData(profileForm))
          });
          const devCode = response.development?.verification_code;
          feedbackMessage(feedback, devCode ? `${response.message} Code de développement : ${devCode}` : response.message);
          if (response.user) {
            document.querySelector("#account-name").textContent = response.user.name || response.user.email;
            profileForm.elements.oldEmail.value = response.user.email;
            if (response.user.email_verified === false) {
              const verificationModal = document.querySelector("#verification-modal");
              verificationModal.querySelector("[name=email]").value = response.user.email;
              verificationModal.hidden = false;
              document.body.classList.add("modal-open");
            }
          }
        } catch (error) {
          feedbackMessage(feedback, error.message);
        }
      });

      const orderResponse = await apiRequest("orders.php");
      const orders = orderResponse.orders || [];
      const renderOrders = (list, emptyMessage, completed = false) => list.length
        ? list.map((order) => `<article class="order-card"><strong>${escapeHtml(order.reference)}</strong><span>${escapeHtml(order.item || "Commande")}</span><b>${escapeHtml(completed ? "Terminée" : order.status)}</b></article>`).join("")
        : `<p class="empty-state">${emptyMessage}</p>`;
      document.querySelector("#current-orders").innerHTML = renderOrders(
        orders.filter((order) => order.status !== "completed" && order.status !== "cancelled"),
        "Aucune commande en cours. Votre panier est prêt à accueillir une sélection."
      );
      document.querySelector("#order-history").innerHTML = renderOrders(
        orders.filter((order) => order.status === "completed"),
        "Votre historique de commandes apparaîtra ici.",
        true
      );
      document.querySelectorAll("[data-dashboard-tab]").forEach((tab) => tab.addEventListener("click", () => {
        document.querySelectorAll("[data-dashboard-tab], [data-dashboard-panel]").forEach((element) => element.classList.remove("active"));
        tab.classList.add("active");
        document.querySelector(`[data-dashboard-panel="${tab.dataset.dashboardTab}"]`).classList.add("active");
      }));
      document.querySelector("#logout").addEventListener("click", async () => {
        await apiRequest("logout.php", { method: "POST" }).catch(() => {});
        window.location.reload();
      });
    } catch (error) {
      feedbackMessage(document.querySelector("#profile-feedback"), error.message);
    }
  }
})();

const getDatabase = () => ({ users: [], orders: [] });
const saveDatabase = () => true;
const adminUsers = document.querySelector("#admin-users");
if (adminUsers) {
  const database = getDatabase();
  document.querySelector("#admin-user-count").textContent = database.users.length;
  document.querySelector("#admin-order-count").textContent = database.orders.length;
  adminUsers.innerHTML = database.users.map((user) => `<div class="admin-row"><strong>${user.email}</strong><span>${user.verified ? "Vérifié" : "En attente"}</span></div>`).join("") || "<p class=\"empty-state\">Aucun compte enregistré.</p>";
  document.querySelector("#admin-orders").innerHTML = database.orders.map((order) => `<div class="admin-row"><strong>${order.reference}</strong><span>${order.status}</span></div>`).join("") || "<p class=\"empty-state\">Aucune commande enregistrée.</p>";
}

const productPage = document.querySelector("[data-product-page]");
if (productPage) {
  const message = document.querySelector("#product-auth-message");
  const addButton = document.querySelector("#add-product");
  (async () => {
    let authenticated = false;
    try {
      const response = await apiRequest("me.php");
      authenticated = response.authenticated === true;
    } catch {
      authenticated = false;
    }
    if (!authenticated) {
      addButton.disabled = true;
      message.textContent = "Connectez-vous pour ajouter cet article vide à votre panier.";
      message.hidden = false;
      return;
    }
    addButton.addEventListener("click", () => {
      localStorage.setItem("morille-canourguaise-cart", "1");
      message.textContent = "Article ajouté au panier. Il est actuellement à venir.";
      message.hidden = false;
    });
  })();
}

const shop = document.querySelector(".products");
if (shop) {
  const cartKey = "morille-canourguaise-cart";
  const cartCount = document.querySelector("#cart-count");
  const cartPanel = document.querySelector("#cart-panel");
  const cartEmpty = document.querySelector("#cart-empty");
  const cartContent = document.querySelector("#cart-content");
  const cartGuestMessage = document.querySelector("#cart-guest-message");
  let cartItems = Number(localStorage.getItem(cartKey) || 0);
  cartEmpty.hidden = true;
  const refreshCart = () => {
    if (cartCount) cartCount.textContent = String(cartItems);
    cartEmpty.hidden = cartItems > 0;
    cartContent.hidden = cartItems === 0;
  };
  document.querySelector("#open-cart")?.addEventListener("click", () => { cartPanel.hidden = false; });
  document.querySelector("[data-close-cart]")?.addEventListener("click", () => { cartPanel.hidden = true; });
  (async () => {
    try {
      const response = await apiRequest("me.php");
      if (response.authenticated === true) {
        cartGuestMessage.hidden = true;
        refreshCart();
      }
    } catch {
      cartGuestMessage.hidden = false;
      cartEmpty.hidden = true;
    }
  })();
  refreshCart();
  cartEmpty.hidden = true;
}

const currentLanguage = document.documentElement.lang || "fr";
const chatbotAssetPrefix = /[\\/]lang[\\/](?:en|es)[\\/]/i.test(window.location.pathname) ? "../../" : "";
const chatbotText = {
  fr: {
    open: "Ouvrir l'assistant", online: "Assistant en ligne", close: "Fermer",
    welcome: "Bonjour et bienvenue chez La Morille Canourgaise.",
    intro: "Je suis l'assistant du site. Je peux vous renseigner sur nos morilles, les arrivages, votre commande ou vous orienter vers la bonne page.",
    prompt: "Comment puis-je vous aider ?", placeholder: "Posez votre question...",
    questions: ["Comment se déroule une commande ?", "Quand les morilles sont-elles disponibles ?", "Je veux découvrir les morilles", "Nous contacter"],
    fallback: "Je peux vous renseigner sur les prix, les disponibilités, la livraison, les moyens de paiement, les commandes, les comptes clients et le contact. Reformulez votre question ou écrivez-nous depuis la page Contact."
  },
  en: {
    open: "Open assistant", online: "Assistant online", close: "Close",
    welcome: "Hello and welcome to La Morille Canourgaise.",
    intro: "I am the site assistant. I can tell you about our morels, arrivals and orders, or direct you to the right page.",
    prompt: "How can I help you?", placeholder: "Ask your question...",
    questions: ["How does an order work?", "When are morels available?", "I want to discover morels", "Contact us"],
    fallback: "I can tell you about prices, availability, delivery, payment methods, orders, customer accounts and contact. Rephrase your question or write to us from the Contact page."
  },
  es: {
    open: "Abrir el asistente", online: "Asistente en línea", close: "Cerrar",
    welcome: "Hola y bienvenido a La Morille Canourgaise.",
    intro: "Soy el asistente del sitio. Puedo informarte sobre nuestras colmenillas, las llegadas y tus pedidos, o dirigirte a la página adecuada.",
    prompt: "¿Cómo puedo ayudarte?", placeholder: "Escribe tu pregunta...",
    questions: ["¿Cómo funciona un pedido?", "¿Cuándo hay colmenillas disponibles?", "Quiero descubrir las colmenillas", "Contacta con nosotros"],
    fallback: "Puedo informarte sobre precios, disponibilidad, entrega, métodos de pago, pedidos, cuentas de clientes y contacto. Reformula tu pregunta o escríbenos desde la página Contacto."
  }
}[currentLanguage] || null;
const chatbot = document.createElement("div");
chatbot.className = "chatbot";
chatbot.innerHTML = `
  <button class="chatbot-toggle" type="button" aria-label="${chatbotText.open}" aria-expanded="false">
    <img src="${chatbotAssetPrefix}logos/logo-la-morille-canourguaise.png" alt="La Morille Canourgaise">
  </button>
  <section class="chatbot-window" hidden aria-label="${chatbotText.online}">
    <header class="chatbot-header">
      <img src="${chatbotAssetPrefix}logos/logo-la-morille-canourguaise.png" alt="La Morille Canourgaise">
      <div><strong>La Morille Canourgaise</strong><span><i></i> ${chatbotText.online}</span></div>
      <button class="chatbot-close" type="button" aria-label="${chatbotText.close}">×</button>
    </header>
    <div class="chatbot-body">
      <div class="chatbot-message">${chatbotText.welcome}<br>
        <img class="chatbot-welcome-logo" src="${chatbotAssetPrefix}logos/logo-la-morille-canourguaise.png" alt="La Morille Canourgaise"><br>
        ${chatbotText.intro}<br><br>
        ${chatbotText.prompt}
      </div>
      <div class="chatbot-suggestions">
        ${chatbotText.questions.map((question) => `<button type="button" data-chat-question="${question}">${question}</button>`).join("")}
      </div>
      <div class="chatbot-conversation" aria-live="polite"></div>
    </div>
    <form class="chatbot-form">
      <input name="question" type="text" placeholder="${chatbotText.placeholder}" autocomplete="off">
      <button type="submit" aria-label="${currentLanguage === "en" ? "Send" : currentLanguage === "es" ? "Enviar" : "Envoyer"}">➤</button>
    </form>
  </section>`;
document.body.append(chatbot);

const chatbotToggle = chatbot.querySelector(".chatbot-toggle");
const chatbotWindow = chatbot.querySelector(".chatbot-window");
const chatbotClose = chatbot.querySelector(".chatbot-close");
const chatbotBody = chatbot.querySelector(".chatbot-body");
const chatbotForm = chatbot.querySelector(".chatbot-form");
const chatbotSuggestions = chatbot.querySelector(".chatbot-suggestions");
const chatbotConversation = chatbot.querySelector(".chatbot-conversation");
const chatReplies = [
  {
    test: /^(bonjour|bonsoir|salut|hello|coucou|merci|merci beaucoup)/i,
    answer: "Bonjour ! Je suis l'assistant de La Morille Canourgaise. Que souhaitez-vous savoir sur nos morilles, les arrivages ou votre commande ?"
  },
  {
    test: /prix|tarif|cout|coût|combien|cher|chere|cheres|€|euro/i,
    answer: "Le prix des morilles est actuellement indiqué « À venir », car il dépend de la récolte et du lot disponible. Nous confirmons le tarif avant toute commande. Contactez-nous pour être informé d'un arrivage."
  },
  {
    test: /commande|acheter|panier|paiement/i,
    answer: "Vous pouvez découvrir la fiche des morilles dans le magasin, puis les ajouter au panier. La commande et les moyens de paiement sont ensuite proposés depuis le panier."
  },
  {
    test: /livraison|exped|envoi|retirer|retrait|livre/i,
    answer: "Les modalités de livraison ou de retrait sont confirmées avec chaque commande selon le lot disponible. Contactez-nous pour connaître les possibilités actuelles."
  },
  {
    test: /paypal|carte bancaire|carte bleue|skrill|secur|sécur/i,
    answer: "Les moyens de paiement prévus sont PayPal, carte bancaire et Skrill. Le choix est présenté lors du parcours de commande."
  },
  {
    test: /disponib|arrivage|saison/i,
    answer: "Les morilles sont une récolte sauvage saisonnière. Leur disponibilité varie naturellement ; consultez le magasin ou contactez-nous pour connaître les arrivages."
  },
  {
    test: /horaire|ouvert|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|quand/i,
    answer: "Notre équipe répond du lundi au dimanche. Pour une question sur un arrivage ou une commande, écrivez-nous depuis la page Contact."
  },
  {
    test: /compte|connect|inscri|mot de passe|email|adresse mail/i,
    answer: "Vous pouvez créer un compte ou vous connecter depuis la rubrique « Mon compte ». Votre espace permet de retrouver vos informations et vos commandes."
  },
  {
    test: /ou |adresse|local|lozere|gévaudan|gevaudan|canourgue|situe/i,
    answer: "La Morille Canourgaise est située à La Canourgue, en Lozère, au cœur du Gévaudan."
  },
  {
    test: /cuisin|prepar|prépar|conserv|seche|sèche|recette/i,
    answer: "La morille est un champignon délicat qui doit être préparé avec soin. Pour des conseils précis sur un lot, contactez notre équipe."
  },
  {
    test: /découvr|morille|produit|fiche/i,
    answer: "La morille est un champignon printanier d'exception, recherché pour son parfum profond. Découvrez sa fiche dans notre magasin."
  },
  {
    test: /contact|joindre|écrire/i,
    answer: "Notre équipe vous répond du lundi au dimanche. Vous pouvez nous écrire depuis la page Contact."
  }
];
const normalizeChatQuestion = (question) => question
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();
const chatAddMessage = (text, type) => {
  const message = document.createElement("div");
  message.className = `chatbot-message chatbot-message-${type}`;
  message.textContent = text;
  chatbotConversation.append(message);
  chatbotBody.scrollTop = chatbotBody.scrollHeight;
};
const chatAnswer = (question) => {
  const normalizedQuestion = normalizeChatQuestion(question);
  if (currentLanguage === "en") {
    if (/hello|hi|thank|welcome/.test(normalizedQuestion)) return "Hello! I am the La Morille Canourgaise assistant. What would you like to know about our morels, arrivals or your order?";
    if (/order|buy|cart|payment/.test(normalizedQuestion)) return "Discover the morel details in the shop, then add them to your cart. Ordering and payment options are available from the cart.";
    if (/available|arrival|season|when/.test(normalizedQuestion)) return "Morels are a seasonal wild harvest. Availability changes naturally; check the shop or contact us about current arrivals.";
    if (/contact|write|reach/.test(normalizedQuestion)) return "Our team answers from Monday to Sunday. You can write to us from the Contact page.";
    if (/price|cost|how much/.test(normalizedQuestion)) return "Morel prices are currently listed as coming soon because they depend on the harvest and available batch. Contact us for an arrival update.";
    return chatbotText.fallback;
  }
  if (currentLanguage === "es") {
    if (/hola|gracias|bienvenid/.test(normalizedQuestion)) return "¡Hola! Soy el asistente de La Morille Canourgaise. ¿Qué quieres saber sobre nuestras colmenillas, las llegadas o tu pedido?";
    if (/pedido|comprar|cesta|pago/.test(normalizedQuestion)) return "Descubre la ficha de las colmenillas en la tienda y añádelas a tu cesta. Las opciones de pedido y pago están disponibles desde la cesta.";
    if (/disponib|llegada|temporada|cuando/.test(normalizedQuestion)) return "Las colmenillas son una cosecha silvestre de temporada. Su disponibilidad varía; consulta la tienda o contacta con nosotros.";
    if (/contact|escribir|comunicar/.test(normalizedQuestion)) return "Nuestro equipo responde de lunes a domingo. Puedes escribirnos desde la página Contacto.";
    if (/precio|coste|cuanto/.test(normalizedQuestion)) return "Los precios de las colmenillas aparecen como próximamente porque dependen de la cosecha y del lote disponible. Contacta con nosotros para conocer las llegadas.";
    return chatbotText.fallback;
  }
  const match = chatReplies.find((reply) => reply.test.test(normalizedQuestion));
  return match?.answer || "Je peux vous renseigner sur les prix, les disponibilités, la livraison, les moyens de paiement, les commandes, les comptes clients et le contact. Reformulez votre question ou écrivez-nous depuis la page Contact.";
};
const chatAsk = (question) => {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  chatAddMessage(cleanQuestion, "user");
  chatAddMessage(chatAnswer(cleanQuestion), "assistant");
};
chatbotToggle.addEventListener("click", () => {
  const open = chatbotWindow.hidden;
  chatbotWindow.hidden = !open;
  chatbotToggle.setAttribute("aria-expanded", String(open));
  if (open) chatbot.querySelector("input").focus();
});
chatbotClose.addEventListener("click", () => {
  chatbotWindow.hidden = true;
  chatbotToggle.setAttribute("aria-expanded", "false");
});
chatbotSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-question]");
  if (button) chatAsk(button.dataset.chatQuestion);
});
chatbotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = chatbotForm.elements.question;
  chatAsk(input.value);
  input.value = "";
});

const translations = {
  en: {
    "Accueil": "Home", "L'histoire des morilles et de la Lozère": "The history of morels and Lozère",
    "Le magasin | La Morille Canourgaise": "Shop | La Morille Canourgaise", "Contact | La Morille Canourgaise": "Contact | La Morille Canourgaise", "Mon compte | La Morille Canourgaise": "My account | La Morille Canourgaise", "L'histoire des morilles | La Morille Canourgaise": "The history of morels | La Morille Canourgaise",
    "La sélection du moment": "This season's selection", "Découvrez notre sélection et ouvrez la fiche morille pour connaître son histoire et l’ajouter à votre panier.": "Discover our selection and open the morel page to learn its story and add it to your cart.",
    "Voir le panier": "View cart", "La récolte du moment": "This season's harvest", "Morilles": "Morels", "Voir la fiche →": "View details →", "Bientôt disponible": "Coming soon", "À venir": "Coming soon", "De nouvelles sélections de notre terroir arriveront prochainement.": "New selections from our land will arrive soon.", "Bientôt": "Soon", "Préparation en cours": "In preparation", "Moyens de paiement sécurisés": "Secure payment methods", "Voir les produits →": "See products →",
    "Une question ?": "Have a question?", "Disponibilité, provenance, préparation ou commande : notre équipe vous répond avec plaisir.": "Availability, origin, preparation or orders: our team will be happy to help.",
    "Service client": "Customer service", "Pour connaître les arrivages ou préparer une commande, le plus simple est de nous écrire.": "To learn about arrivals or prepare an order, simply write to us.", "Votre message": "Your message", "Parlons de vos envies": "Tell us what you need",
    "Espace client": "Customer area", "Mon compte": "My account", "Créez votre espace personnel, vérifiez votre adresse puis retrouvez vos informations et vos commandes.": "Create your personal space, verify your address, and find your information and orders.",
    "Espace personnel": "Personal space", "Inscrivez-vous pour retrouver vos informations, votre panier et vos commandes.": "Sign up to find your information, cart and orders.", "Continuer": "Continue", "Dernière étape": "Final step", "Vérifiez votre adresse email": "Verify your email address", "Se déconnecter": "Log out",
    "Du Gévaudan à la Lozère": "From Gévaudan to Lozère", "Quand un champignon d'exception rencontre une terre d'exception.": "When an exceptional mushroom meets an exceptional land.", "Voir les produits": "See products",
    "Commande": "Order", "Choisissez votre moyen de paiement. Cette page prépare le parcours, sans déclencher de paiement réel.": "Choose your payment method. This page prepares the process without making a real payment.", "Votre moyen de paiement": "Your payment method", "Continuer en sécurité": "Continue securely",
    "Du Gévaudan à la Lozère": "From Gévaudan to Lozère", "Quand un champignon d'exception rencontre une terre d'exception.": "When an exceptional mushroom meets an exceptional land.", "La Lozère, une terre née du Gévaudan": "Lozère, a land born from Gévaudan", "Une terre propice aux champignons": "A land suited to mushrooms", "Et puis arrive le printemps…": "And then spring arrives…", "Le trésor que la forêt ne montre pas": "The treasure the forest does not reveal", "Une connaissance qui se transmet": "Knowledge passed down", "Pourquoi la Lozère est si intéressante": "Why Lozère is so special", "La cueillette, un geste patient": "Foraging, a patient gesture", "La morille devient un produit de terroir": "The morel becomes a local product", "De la forêt à la gastronomie": "From forest to gastronomy", "Une histoire qui continue aujourd'hui": "A story that continues today",
    "Échangeons": "Let's talk", "Votre nom": "Your name", "Votre email": "Your email", "Objet": "Subject", "Votre message": "Your message", "Envoyer le message": "Send message", "Demande d'information": "Information request", "Disponibilité d'un produit": "Product availability", "Professionnel / restaurant": "Professional / restaurant", "En ligne": "Online", "Retour à l'accueil →": "Back to home →", "Passer au contact →": "Go to contact →",
    "Sélection sauvage de Lozère": "Wild selection from Lozère", "Ajouter au panier": "Add to cart", "Continuer la navigation": "Continue browsing", "Passer la commande →": "Place the order →", "Votre panier": "Your cart", "Votre panier est vide.": "Your cart is empty.", "Se connecter": "Log in", "Retour au magasin": "Back to shop", "Retour au magasin →": "Back to shop →",
    "Une sélection sauvage de Lozère, rare et délicate, proposée selon les arrivages.": "A rare and delicate wild selection from Lozère, offered according to each arrival.", "Les moyens de paiement seront proposés lors de la commande, après confirmation du lot disponible.": "Payment methods will be offered when ordering, after confirmation of the available batch.", "La disponibilité des morilles sauvages varie naturellement selon la saison. Les moyens de paiement seront proposés lors de la commande, après confirmation du lot disponible.": "Wild morel availability naturally varies with the season. Payment methods will be offered when ordering, after confirmation of the available batch.", "Les paiements seront traités via des solutions reconnues au moment de la commande.": "Payments will be processed through trusted solutions when the order is placed.", "La morille est un champignon printanier d’exception, recherché pour son parfum profond et sa texture délicate. Chaque lot est sélectionné avec soin selon la récolte et la disponibilité naturelle.": "The morel is an exceptional spring mushroom, prized for its deep aroma and delicate texture. Each batch is carefully selected according to the harvest and natural availability.", "Produit saisonnier — disponibilité et conditionnement confirmés avant commande.": "Seasonal product — availability and packaging confirmed before ordering.", "Votre sélection de Lozère": "Your selection from Lozère", "Vous n'êtes pas connecté.": "You are not logged in.", "Connectez-vous pour retrouver votre panier et préparer votre commande.": "Log in to retrieve your cart and prepare your order.", "sélection selon arrivage": "selection according to arrival", "Passer au contact →": "Go to contact →", "Voir la fiche des morilles": "View the morel details", "Fermer": "Close", "Créer un compte / Se connecter": "Create an account / Log in", "La Morille Canourgaise": "La Morille Canourgaise",
    "Créer un compte": "Create an account", "Validation du mot de passe": "Confirm password", "8 caractères minimum": "8 characters minimum", "Retapez votre mot de passe": "Re-enter your password", "Code reçu par email": "Code received by email", "Code à 6 chiffres": "6-digit code", "Vérifier mon adresse": "Verify my address", "Espace privé": "Private area", "Gestion du compte": "Account management", "Commandes en cours": "Current orders", "Historique": "History", "Enregistrer mes informations": "Save my information", "Retourner au magasin": "Return to shop", "Passer au paiement": "Proceed to payment",
    "Le magasin": "Shop", "Contact": "Contact", "Mon compte": "My account",
    "Lozère du Gévaudan": "Lozère of Gévaudan",
    "Des morilles de Lozère, sélectionnées avec exigence et proposées au fil des saisons. Un goût rare, une origine sincère.": "Morels from Lozère, carefully selected and offered throughout the seasons. A rare taste, an authentic origin.",
    "L'or sauvage|à portée de table": "The wild gold|at your table",
    "L'histoire des morilles|et de la Lozère": "The history of morels|and Lozère",
    "terroir|lozérien": "local land|of Lozère",
    "Explorer la récolte": "Explore the harvest", "Entrer dans notre histoire": "Discover our story",
    "Une sélection locale, au rythme de la nature": "A local selection, in nature's rhythm",
    "Voir les disponibilités": "See availability", "La récolte": "The harvest",
    "Rare par nature.": "Rare by nature.", "Chaque arrivage raconte une saison et un coin de Lozère.": "Each arrival tells the story of a season and a place in Lozère.", "Notre promesse": "Our promise",
    "✦ Morilles sauvages": "✦ Wild morels", "✦ Sélectionnées à la main": "✦ Hand-selected", "✦ L'esprit de la Lozère": "✦ The spirit of Lozère", "✦ Du forestier au cuisinier": "✦ From forest to chef",
    "Simple, qualité, fraicheur, naturel": "Simple, quality, freshness, natural",
    "Une récolte d'exception": "An exceptional harvest", "Le goût d'un territoire": "The taste of a land",
    "Entre nature, forêts et vallées, la Lozère offre un terroir préservé. Nous travaillons avec des cueilleurs locaux et des propriétaires forestiers pour sélectionner des morilles sauvages avec plus grand soin.": "Between nature, forests and valleys, Lozère offers a preserved land. We work with local foragers and woodland owners to select wild morels with the greatest care.",
    "Chaque étape compte pour préserver le caractère unique de ce champignon sauvage.": "Every step matters to preserve the unique character of this wild mushroom.",
    "Nos morilles sont issues de collectes en Lozère et leur provenance est indiquée avec soin.": "Our morels are gathered in Lozère and their origin is carefully documented.",
    "Triées à la main, elles sont choisies pour leur qualité, leur parfum et leur belle maturité.": "Hand-sorted, they are chosen for their quality, aroma and perfect maturity.",
    "Nous valorisons le travail des cueilleurs et la transmission d'un savoir local.": "We value the work of foragers and the passing on of local knowledge.",
    "En savoir plus": "Learn more", "Une origine claire": "A clear origin",
    "Une sélection exigeante": "A demanding selection", "Un savoir partagé": "Shared knowledge",
    "Voir la sélection": "See the selection", "Notre terroir": "Our land", "Nous rencontrer": "Meet us",
    "Échangeons": "Let's talk", "Le magasin": "Shop", "Se connecter": "Log in",
    "Créer un compte": "Create an account", "Mon compte": "My account", "Paiement": "Payment",
    "Administration": "Administration", "Vérifiez votre adresse email": "Verify your email address",
    "Créons votre espace": "Create your space", "Retrouvons-nous": "Welcome back",
    "Au plaisir de vous accompagner": "We are happy to help", "Parlons de vos envies": "Tell us what you need", "Une question ? Parlons-en →": "Have a question? Let's talk →"
  },
  es: {
    "Accueil": "Inicio", "L'histoire des morilles et de la Lozère": "Historia de las colmenillas y Lozère",
    "Le magasin | La Morille Canourgaise": "Tienda | La Morille Canourgaise", "Contact | La Morille Canourgaise": "Contacto | La Morille Canourgaise", "Mon compte | La Morille Canourgaise": "Mi cuenta | La Morille Canourgaise", "L'histoire des morilles | La Morille Canourgaise": "Historia de las colmenillas | La Morille Canourgaise",
    "La sélection du moment": "Selección de la temporada", "Découvrez notre sélection et ouvrez la fiche morille pour connaître son histoire et l’ajouter à votre panier.": "Descubre nuestra selección y abre la ficha de la colmenilla para conocer su historia y añadirla a tu cesta.",
    "Voir le panier": "Ver cesta", "La récolte du moment": "La cosecha de la temporada", "Morilles": "Colmenillas", "Voir la fiche →": "Ver detalles →", "Bientôt disponible": "Próximamente", "À venir": "Próximamente", "De nouvelles sélections de notre terroir arriveront prochainement.": "Próximamente llegarán nuevas selecciones de nuestra tierra.", "Bientôt": "Pronto", "Préparation en cours": "En preparación", "Moyens de paiement sécurisés": "Métodos de pago seguros", "Voir les produits →": "Ver productos →",
    "Une question ?": "¿Tienes una pregunta?", "Disponibilité, provenance, préparation ou commande : notre équipe vous répond avec plaisir.": "Disponibilidad, origen, preparación o pedidos: estaremos encantados de ayudarte.",
    "Service client": "Atención al cliente", "Pour connaître les arrivages ou préparer une commande, le plus simple est de nous écrire.": "Para conocer las llegadas o preparar un pedido, escríbenos.", "Votre message": "Tu mensaje",
    "Espace client": "Área de cliente", "Créez votre espace personnel, vérifiez votre adresse puis retrouvez vos informations et vos commandes.": "Crea tu espacio personal, verifica tu dirección y encuentra tus datos y pedidos.",
    "Espace personnel": "Espacio personal", "Inscrivez-vous pour retrouver vos informations, votre panier et vos commandes.": "Regístrate para encontrar tus datos, tu cesta y tus pedidos.", "Continuer": "Continuar", "Dernière étape": "Último paso", "Se déconnecter": "Cerrar sesión",
    "Du Gévaudan à la Lozère": "Del Gévaudan a Lozère", "Quand un champignon d'exception rencontre une terre d'exception.": "Cuando un hongo excepcional encuentra una tierra excepcional.", "Voir les produits": "Ver productos",
    "Commande": "Pedido", "Choisissez votre moyen de paiement. Cette page prépare le parcours, sans déclencher de paiement réel.": "Elige tu método de pago. Esta página prepara el proceso sin realizar un pago real.", "Votre moyen de paiement": "Tu método de pago", "Continuer en sécurité": "Continuar de forma segura",
    "Du Gévaudan à la Lozère": "Del Gévaudan a Lozère", "Quand un champignon d'exception rencontre une terre d'exception.": "Cuando un hongo excepcional encuentra una tierra excepcional.", "La Lozère, une terre née du Gévaudan": "Lozère, una tierra nacida del Gévaudan", "Une terre propice aux champignons": "Una tierra propicia para las setas", "Et puis arrive le printemps…": "Y llega la primavera…", "Le trésor que la forêt ne montre pas": "El tesoro que el bosque no muestra", "Une connaissance qui se transmet": "Un conocimiento que se transmite", "Pourquoi la Lozère est si intéressante": "Por qué Lozère es tan especial", "La cueillette, un geste patient": "La recolección, un gesto paciente", "La morille devient un produit de terroir": "La colmenilla se convierte en producto local", "De la forêt à la gastronomie": "Del bosque a la gastronomía", "Une histoire qui continue aujourd'hui": "Una historia que continúa hoy",
    "Échangeons": "Hablemos", "Votre nom": "Tu nombre", "Votre email": "Tu correo", "Objet": "Asunto", "Votre message": "Tu mensaje", "Envoyer le message": "Enviar mensaje", "Demande d'information": "Solicitud de información", "Disponibilité d'un produit": "Disponibilidad de un producto", "Professionnel / restaurant": "Profesional / restaurante", "En ligne": "En línea", "Retour à l'accueil →": "Volver al inicio →", "Passer au contact →": "Ir al contacto →",
    "Sélection sauvage de Lozère": "Selección silvestre de Lozère", "Ajouter au panier": "Añadir a la cesta", "Continuer la navigation": "Continuar navegando", "Passer la commande →": "Realizar el pedido →", "Votre panier": "Tu cesta", "Votre panier est vide.": "Tu cesta está vacía.", "Retour au magasin": "Volver a la tienda", "Retour au magasin →": "Volver a la tienda →",
    "Accueil": "Inicio", "L'histoire des morilles et de la Lozère": "Historia de las colmenillas y Lozère", "La sélection du moment": "Selección de la temporada", "Découvrez notre sélection et ouvrez la fiche morille pour connaître son histoire et l’ajouter à votre panier.": "Descubre nuestra selección y abre la ficha de la colmenilla para conocer su historia y añadirla a tu cesta.", "Créer un compte / Se connecter": "Crear una cuenta / Iniciar sesión", "La disponibilité des morilles sauvages varie naturellement selon la saison. Les moyens de paiement seront proposés lors de la commande, après confirmation du lot disponible.": "La disponibilidad de las colmenillas silvestres varía naturalmente según la temporada. Los métodos de pago se ofrecerán al realizar el pedido, tras confirmar el lote disponible.", "Voir le panier": "Ver cesta", "Voir la fiche des morilles": "Ver detalles de las colmenillas", "La récolte du moment": "La cosecha de la temporada", "Une sélection sauvage de Lozère, rare et délicate, proposée selon les arrivages.": "Una selección silvestre de Lozère, rara y delicada, ofrecida según cada llegada.", "Bientôt disponible": "Próximamente", "De nouvelles sélections de notre terroir arriveront prochainement.": "Próximamente llegarán nuevas selecciones de nuestra tierra.", "Préparation en cours": "En preparación", "Moyens de paiement sécurisés": "Métodos de pago seguros", "Les paiements seront traités via des solutions reconnues au moment de la commande.": "Los pagos se procesarán mediante soluciones reconocidas al realizar el pedido.", "Fermer": "Cerrar", "Produit saisonnier — disponibilité et conditionnement confirmés avant commande.": "Producto de temporada — disponibilidad y envasado confirmados antes del pedido.", "Ajouter au panier": "Añadir a la cesta", "Continuer la navigation": "Continuar navegando", "Passer la commande →": "Realizar el pedido →", "Votre sélection de Lozère": "Tu selección de Lozère", "Vous n'êtes pas connecté.": "No has iniciado sesión.", "Connectez-vous pour retrouver votre panier et préparer votre commande.": "Inicia sesión para recuperar tu cesta y preparar tu pedido.", "Votre panier est vide.": "Tu cesta está vacía.", "sélection selon arrivage": "selección según cada llegada", "Passer au contact →": "Ir al contacto →",
    "Une question ?": "¿Tienes una pregunta?", "Échangeons": "Hablemos", "Disponibilité, provenance, préparation ou commande : notre équipe vous répond avec plaisir.": "Disponibilidad, origen, preparación o pedidos: estaremos encantados de ayudarte.", "Service client": "Atención al cliente", "Au plaisir de vous accompagner": "Estamos encantados de ayudarte", "Pour connaître les arrivages ou préparer une commande, le plus simple est de nous écrire.": "Para conocer las llegadas o preparar un pedido, escríbenos.", "Email": "Correo electrónico", "Réponse": "Respuesta", "Du lundi au dimanche": "De lunes a domingo", "Votre nom": "Tu nombre", "Votre email": "Tu correo", "Objet": "Asunto", "Votre message": "Tu mensaje", "Envoyer le message": "Enviar el mensaje", "En ligne": "En línea", "Une question sur une récolte, une commande ou notre terroir ? Écrivez-nous, nous vous répondrons avec attention.": "¿Tienes una pregunta sobre una cosecha, un pedido o nuestra tierra? Escríbenos y te responderemos con atención.", "Demande d'information": "Solicitud de información", "Disponibilité d'un produit": "Disponibilidad de un producto", "Professionnel / restaurant": "Profesional / restaurante", "Commande": "Pedido", "Retour à l'accueil →": "Volver al inicio →",
    "Connexion": "Inicio de sesión", "Espace client": "Área de cliente", "Se connecter": "Iniciar sesión", "Utilisez l’adresse email et le mot de passe de votre compte vérifié.": "Usa el correo electrónico y la contraseña de tu cuenta verificada.", "Bienvenue": "Bienvenido", "Retrouvons-nous": "Nos reencontramos", "Connectez-vous pour accéder à votre espace personnel et suivre vos commandes.": "Inicia sesión para acceder a tu espacio personal y seguir tus pedidos.", "Adresse email": "Correo electrónico", "Mot de passe": "Contraseña", "Votre mot de passe": "Tu contraseña",
    "Mon compte": "Mi cuenta", "Créez votre espace personnel, vérifiez votre adresse puis retrouvez vos informations et vos commandes.": "Crea tu espacio personal, verifica tu dirección y encuentra tus datos y pedidos.", "Créer un compte": "Crear una cuenta", "Inscrivez-vous pour retrouver vos informations, votre panier et vos commandes.": "Regístrate para encontrar tus datos, tu cesta y tus pedidos.", "Validation du mot de passe": "Confirmación de contraseña", "8 caractères minimum": "8 caracteres como mínimo", "Retapez votre mot de passe": "Repite tu contraseña", "Dernière étape": "Último paso", "Vérifiez votre adresse email": "Verifica tu correo electrónico", "Entrez le code reçu à l’adresse indiquée pour activer votre compte.": "Introduce el código recibido en la dirección indicada para activar tu cuenta.", "Code reçu par email": "Código recibido por correo", "Code à 6 chiffres": "Código de 6 cifras", "Vérifier mon adresse": "Verificar mi dirección", "Espace privé": "Espacio privado", "Bonjour,": "Hola,", "Se déconnecter": "Cerrar sesión", "Gestion du compte": "Gestión de la cuenta", "Commandes en cours": "Pedidos actuales", "Historique": "Historial", "Ancienne adresse email": "Dirección de correo anterior", "Nouvelle adresse email": "Nueva dirección de correo", "Téléphone": "Teléfono", "Prénom et nom": "Nombre y apellidos", "Votre nom complet": "Tu nombre completo", "Numéro de voie": "Número de la vía", "Rue": "Calle", "Nom de la rue": "Nombre de la calle", "Code postal": "Código postal", "Ville": "Ciudad", "Pays": "País", "Enregistrer mes informations": "Guardar mis datos", "Retourner au magasin": "Volver a la tienda", "Passer au paiement": "Ir al pago", "Retour au magasin →": "Volver a la tienda →",
    "Créer un compte": "Crear una cuenta", "Validation du mot de passe": "Confirmar contraseña", "8 caractères minimum": "8 caracteres como mínimo", "Retapez votre mot de passe": "Repite tu contraseña", "Code reçu par email": "Código recibido por correo", "Code à 6 chiffres": "Código de 6 cifras", "Vérifier mon adresse": "Verificar mi dirección", "Espace privé": "Espacio privado", "Gestion du compte": "Gestión de la cuenta", "Commandes en cours": "Pedidos actuales", "Enregistrer mes informations": "Guardar mis datos", "Retourner au magasin": "Volver a la tienda", "Passer au paiement": "Ir al pago",
    "Le magasin": "Tienda", "Contact": "Contacto", "Mon compte": "Mi cuenta",
    "Lozère du Gévaudan": "Lozère del Gévaudan",
    "Des morilles de Lozère, sélectionnées avec exigence et proposées au fil des saisons. Un goût rare, une origine sincère.": "Colmenillas de Lozère, seleccionadas con cuidado y ofrecidas durante las estaciones. Un sabor único, un origen auténtico.",
    "L'or sauvage|à portée de table": "El oro silvestre|en tu mesa",
    "L'histoire des morilles|et de la Lozère": "La historia de las colmenillas|y Lozère",
    "terroir|lozérien": "tierra local|de Lozère",
    "Explorer la récolte": "Explorar la cosecha", "Entrer dans notre histoire": "Conocer nuestra historia",
    "Une sélection locale, au rythme de la nature": "Una selección local al ritmo de la naturaleza",
    "Voir les disponibilités": "Ver disponibilidad", "La récolte": "La cosecha",
    "Rare par nature.": "Raro por naturaleza.", "Chaque arrivage raconte une saison et un coin de Lozère.": "Cada llegada cuenta la historia de una estación y un rincón de Lozère.", "Notre promesse": "Nuestra promesa",
    "✦ Morilles sauvages": "✦ Colmenillas silvestres", "✦ Sélectionnées à la main": "✦ Seleccionadas a mano", "✦ L'esprit de la Lozère": "✦ El espíritu de Lozère", "✦ Du forestier au cuisinier": "✦ Del bosque al cocinero",
    "Simple, qualité, fraicheur, naturel": "Simple, calidad, frescura, natural",
    "Une récolte d'exception": "Una cosecha excepcional", "Le goût d'un territoire": "El sabor de una tierra",
    "Entre nature, forêts et vallées, la Lozère offre un terroir préservé. Nous travaillons avec des cueilleurs locaux et des propriétaires forestiers pour sélectionner des morilles sauvages avec plus grand soin.": "Entre naturaleza, bosques y valles, Lozère ofrece una tierra preservada. Trabajamos con recolectores locales y propietarios forestales para seleccionar colmenillas silvestres con el máximo cuidado.",
    "Chaque étape compte pour préserver le caractère unique de ce champignon sauvage.": "Cada paso cuenta para preservar el carácter único de este hongo silvestre.",
    "Nos morilles sont issues de collectes en Lozère et leur provenance est indiquée avec soin.": "Nuestras colmenillas se recolectan en Lozère y su origen se indica cuidadosamente.",
    "Triées à la main, elles sont choisies pour leur qualité, leur parfum et leur belle maturité.": "Seleccionadas a mano, se eligen por su calidad, aroma y perfecta madurez.",
    "Nous valorisons le travail des cueilleurs et la transmission d'un savoir local.": "Valoramos el trabajo de los recolectores y la transmisión de los conocimientos locales.",
    "En savoir plus": "Saber más", "Une origine claire": "Un origen claro",
    "Une sélection exigeante": "Una selección exigente", "Un savoir partagé": "Un saber compartido",
    "Voir la sélection": "Ver la selección", "Notre terroir": "Nuestra tierra", "Nous rencontrer": "Conócenos",
    "Échangeons": "Hablemos", "Se connecter": "Iniciar sesión", "Créer un compte": "Crear una cuenta",
    "Paiement": "Pago", "Administration": "Administración", "Vérifiez votre adresse email": "Verifica tu correo",
    "Créons votre espace": "Crea tu espacio", "Retrouvons-nous": "Bienvenido de nuevo",
    "Au plaisir de vous accompagner": "Estamos encantados de ayudarte", "Parlons de vos envies": "Cuéntanos qué necesitas", "Une question ? Parlons-en →": "¿Tienes una pregunta? Hablemos →"
  }
};
const languageLabels = { fr: "FR", en: "EN", es: "ES" };
const languageSwitcher = document.createElement("div");
languageSwitcher.className = "language-switcher";
languageSwitcher.setAttribute("aria-label", "Choisir la langue");
Object.entries(languageLabels).forEach(([language, label]) => {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.language = language;
  button.textContent = label;
  languageSwitcher.append(button);
});
const languagePathMatch = window.location.pathname.match(/[\\/]lang[\\/]((?:en)|(?:es))[\\/]/i);
const pageLanguage = languagePathMatch ? languagePathMatch[1].toLowerCase() : "fr";
document.querySelector("nav")?.append(languageSwitcher);
const applyLanguage = (language) => {
  const dictionary = translations[language] || {};
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = dictionary[element.dataset.i18nHtml] || element.dataset.i18nHtml;
    const parts = value.split("|");
    element.innerHTML = `${parts[0]}<br><em>${parts[1]}</em>`;
  });
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = language === "fr" ? key : (dictionary[key] || key);
  });
  document.title = dictionary[document.title] || document.title;
  document.querySelectorAll("input[placeholder], textarea[placeholder], [aria-label], img[alt], [title]").forEach((element) => {
    ["placeholder", "aria-label", "alt", "title"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
    });
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const key = node.nodeValue.trim();
    if (!key || node.parentElement.closest(".language-switcher") || node.parentElement.dataset.i18n) return;
    const translated = language === "fr" ? key : dictionary[key];
    if (translated) node.nodeValue = node.nodeValue.replace(key, translated);
  });
  languageSwitcher.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.language === language);
  });
  localStorage.setItem("site-language", language);
};
languageSwitcher.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-language]");
  if (button) {
    const language = button.dataset.language;
    localStorage.setItem("site-language", language);
    const currentPage = window.location.pathname.split(/[\\/]/).pop() || "index.html";
    const siteRoot = window.location.pathname.replace(/\/(?:lang\/(?:en|es)\/)?[^/]*$/, "");
    const targetPage = language === "fr" ? currentPage : `lang/${language}/${currentPage}`;
    window.location.href = `${siteRoot}/${targetPage}`;
  }
});
applyLanguage(pageLanguage);
