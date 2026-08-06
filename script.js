document.getElementById("ano").textContent = new Date().getFullYear();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

const phone = document.querySelector('input[name="telefone"]');
const normalizedPhone = document.getElementById("telefone-normalizado");
const phoneError = document.getElementById("telefone-erro");
const leadForm = document.querySelector(".lead-form");

const validBrazilianAreaCodes = new Set([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46","47","48","49",
  "51","53","54","55",
  "61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99"
]);

function getPhoneDigits(value) {
  let digits = value.replace(/\D/g, "");

  // Aceita colagem com o código do Brasil (+55).
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

function formatBrazilianPhone(value) {
  const digits = getPhoneDigits(value);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateBrazilianWhatsApp(showMessage = true) {
  if (!phone) return true;

  const digits = getPhoneDigits(phone.value);
  let message = "";

  if (digits.length !== 11) {
    message = "Digite um WhatsApp completo com DDD e 11 números.";
  } else if (!validBrazilianAreaCodes.has(digits.slice(0, 2))) {
    message = "O DDD informado não é válido.";
  } else if (digits.charAt(2) !== "9") {
    message = "Celulares brasileiros devem começar com 9 após o DDD.";
  } else if (new Set(digits.slice(2)).size === 1) {
    message = "Confira o número informado.";
  }

  phone.setCustomValidity(message);
  phone.classList.toggle("input-invalid", Boolean(message));
  phone.classList.toggle("input-valid", !message && digits.length === 11);

  if (phoneError && showMessage) {
    phoneError.textContent = message;
  }

  if (!message && normalizedPhone) {
    normalizedPhone.value = `+55${digits}`;
  }

  return !message;
}

if (phone) {
  phone.addEventListener("input", () => {
    phone.value = formatBrazilianPhone(phone.value);
    phone.setCustomValidity("");
    phone.classList.remove("input-invalid");

    if (phoneError) {
      phoneError.textContent = "";
    }

    if (getPhoneDigits(phone.value).length === 11) {
      validateBrazilianWhatsApp(true);
    }
  });

  phone.addEventListener("blur", () => {
    validateBrazilianWhatsApp(true);
  });

  phone.addEventListener("paste", () => {
    window.setTimeout(() => {
      phone.value = formatBrazilianPhone(phone.value);
      validateBrazilianWhatsApp(true);
    }, 0);
  });
}


const contactType = document.getElementById("tipo-contato");
const companyFields = document.getElementById("campos-empresa");
const candidateWarning = document.getElementById("aviso-candidato");

function updateContactType() {
  if (!contactType || !companyFields || !candidateWarning) return;

  const isCandidate = contactType.value === "candidato";
  const isCompany = contactType.value === "empresa";

  candidateWarning.hidden = !isCandidate;
  companyFields.hidden = isCandidate;

  companyFields.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = isCandidate;
  });

  if (isCompany) {
    companyFields.hidden = false;
    companyFields.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = false;
    });
  }
}

if (contactType) {
  contactType.addEventListener("change", () => {
    contactType.setCustomValidity("");
    updateContactType();
  });
  updateContactType();
}

if (leadForm) {
  const submitButton = document.getElementById("submit-lead");
  const formStatus = document.getElementById("form-status");
  const originalButtonText = submitButton ? submitButton.textContent : "";
  let isSubmitting = false;

  function setFormStatus(message, type = "") {
    if (!formStatus) return;

    formStatus.textContent = message;
    formStatus.classList.toggle("form-status-error", type === "error");
    formStatus.classList.toggle("form-status-success", type === "success");
  }

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactType || contactType.value !== "empresa") {
      if (contactType) {
        contactType.setCustomValidity(
          contactType.value === "candidato"
            ? "Este formulário é exclusivo para empresas que desejam contratar."
            : "Selecione para qual finalidade você está entrando em contato."
        );
        contactType.reportValidity();
        contactType.focus();
      }
      return;
    }

    contactType.setCustomValidity("");

    if (!validateBrazilianWhatsApp(true)) {
      phone.focus();
      phone.reportValidity();
      return;
    }

    if (!leadForm.checkValidity()) {
      leadForm.reportValidity();
      return;
    }

    if (isSubmitting) return;
    isSubmitting = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    setFormStatus("Enviando sua solicitação...");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      const formData = new FormData(leadForm);
      const payload = Object.fromEntries(formData.entries());

      // Informa ao FormSubmit a página exata de origem, sem parâmetros de depuração.
      payload._url = `${window.location.origin}${window.location.pathname}`;

      // O redirecionamento será feito pelo próprio site após a confirmação do envio.
      const successUrl = payload._next;
      delete payload._next;

      const ajaxEndpoint = leadForm.action.replace(
        "https://formsubmit.co/",
        "https://formsubmit.co/ajax/"
      );

      const response = await fetch(ajaxEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      let result = null;

      try {
        result = await response.json();
      } catch {
        throw new Error("O serviço de formulário retornou uma resposta inesperada.");
      }

      const submissionFailed =
        !response.ok ||
        result?.success === false ||
        result?.success === "false";

      if (submissionFailed) {
        throw new Error(result?.message || "Não foi possível enviar a solicitação.");
      }

      setFormStatus("Solicitação recebida. Redirecionando...", "success");
      window.location.assign(successUrl);
    } catch (error) {
      const timedOut = error?.name === "AbortError";

      setFormStatus(
        timedOut
          ? "O envio demorou mais que o esperado. Tente novamente."
          : "Não foi possível enviar agora. Confira sua conexão e tente novamente.",
        "error"
      );

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }

      isSubmitting = false;
      console.error("Erro ao enviar formulário:", error);
    } finally {
      window.clearTimeout(timeoutId);
    }
  });
}
