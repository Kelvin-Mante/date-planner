const landing = document.querySelector("#landing");
const envelope = document.querySelector("#open-envelope");
const invitation = document.querySelector("#invitation");
const question = document.querySelector("#question");
const yesButton = document.querySelector("#yes-button");
const noButton = document.querySelector("#no-button");
const answers = document.querySelector("#answers");
const hint = document.querySelector("#no-hint");
const datePicker = document.querySelector("#date-picker");
const availability = document.querySelector("#availability");
const dateQuestion = document.querySelector("#date-question");
const availabilityQuestion = document.querySelector("#availability-question");
const chosenDate = document.querySelector("#chosen-date");
const freeDate = document.querySelector("#free-date");
const timePreference = document.querySelector("#time-preference");
const extraNote = document.querySelector("#extra-note");
const availabilityNote = document.querySelector("#availability-note");
const submitAvailability = document.querySelector("#submit-availability");
const flexibleButton = document.querySelector("#flexible-button");
const supabaseSettings = window.OUR_DATE_SUPABASE || {};
const hasSupabaseSettings = typeof supabaseSettings.url === "string"
  && supabaseSettings.url.startsWith("https://")
  && typeof supabaseSettings.publishableKey === "string"
  && supabaseSettings.publishableKey.length > 20
  && !supabaseSettings.publishableKey.startsWith("YOUR_");
const supabaseClient = hasSupabaseSettings && window.supabase?.createClient
  ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.publishableKey)
  : null;

let opened = false;
let answered = false;
let isSavingResponse = false;
let responseWasSaved = false;

const today = new Date();
freeDate.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");

envelope.addEventListener("click", () => {
  if (opened) return;
  opened = true;
  envelope.setAttribute("aria-expanded", "true");
  envelope.classList.add("is-opening");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(() => {
    landing.classList.add("is-leaving");
    window.setTimeout(() => {
      landing.hidden = true;
      invitation.hidden = false;
      question.focus({ preventScroll: true });
    }, reducedMotion ? 0 : 380);
  }, reducedMotion ? 0 : 780);
});

function dodgeNoButton() {
  const area = answers.getBoundingClientRect();
  const button = noButton.getBoundingClientRect();
  const yes = yesButton.getBoundingClientRect();
  const gap = 14;
  const maxLeft = Math.max(0, area.width - button.width);
  const maxTop = Math.max(0, area.height - button.height);
  const yesBox = {
    left: yes.left - area.left - gap,
    right: yes.right - area.left + gap,
    top: yes.top - area.top - gap,
    bottom: yes.bottom - area.top + gap,
  };

  let next = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = {
      left: Math.random() * maxLeft,
      top: Math.random() * maxTop,
    };
    const overlapsYes = candidate.left < yesBox.right
      && candidate.left + button.width > yesBox.left
      && candidate.top < yesBox.bottom
      && candidate.top + button.height > yesBox.top;
    if (!overlapsYes) {
      next = candidate;
      break;
    }
  }

  // If this viewport has no safe spot, keep No in its original, non-overlapping position.
  if (!next) return;

  noButton.style.position = "absolute";
  noButton.style.left = `${next.left}px`;
  noButton.style.top = `${next.top}px`;
  hint.textContent = "Hehe, the ‘no’ is a little shy.";
}

noButton.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse" && window.matchMedia("(min-width: 521px)").matches) {
    dodgeNoButton();
  }
});

answers.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || !window.matchMedia("(min-width: 521px)").matches) return;
  const button = noButton.getBoundingClientRect();
  const distance = Math.hypot(
    event.clientX - (button.left + button.width / 2),
    event.clientY - (button.top + button.height / 2),
  );
  if (distance < 58) dodgeNoButton();
});

noButton.addEventListener("click", () => {
  if (answered) return;
  answered = true;
  hint.textContent = "No pressure at all. Thanks for being honest.";
  noButton.style.position = "static";
});

yesButton.addEventListener("click", () => {
  if (answered) return;
  answered = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  invitation.classList.add("is-leaving");
  window.setTimeout(() => {
    invitation.hidden = true;
    datePicker.hidden = false;
    dateQuestion.focus({ preventScroll: true });
  }, reducedMotion ? 0 : 300);
});

document.querySelectorAll(".date-option").forEach((option) => {
  option.addEventListener("click", () => {
    chosenDate.textContent = option.dataset.choice;
    datePicker.classList.add("is-leaving");
    window.setTimeout(() => {
      datePicker.hidden = true;
      datePicker.classList.remove("is-leaving");
      availability.hidden = false;
      availabilityQuestion.focus({ preventScroll: true });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300);
  });
});

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
}

freeDate.addEventListener("change", () => {
  if (!freeDate.value || responseWasSaved) return;
  availabilityNote.textContent = `${formatDate(freeDate.value)} — tap “Send this date” to send your answer.`;
});

async function saveDateResponse(isFlexible) {
  if (isSavingResponse || responseWasSaved) return;
  if (!isFlexible && !freeDate.value) {
    availabilityNote.textContent = "Choose a day first, or tap “I’m flexible — you pick.”";
    freeDate.focus();
    return;
  }
  if (!supabaseClient) {
    availabilityNote.textContent = "Supabase is not connected yet. Add your project URL and publishable key to supabase-config.js.";
    return;
  }

  isSavingResponse = true;
  submitAvailability.disabled = true;
  flexibleButton.disabled = true;
  freeDate.disabled = true;
  timePreference.disabled = true;
  extraNote.disabled = true;
  submitAvailability.textContent = "Sending…";
  availabilityNote.textContent = "Saving your answer…";

  let error = null;
  try {
    ({ error } = await supabaseClient.from("date_responses").insert({
      date_choice: chosenDate.textContent,
      available_on: isFlexible ? null : freeDate.value,
      is_flexible: isFlexible,
      time_preference: timePreference.value,
      extra_note: extraNote.value.trim() || null,
    }));
  } catch (requestError) {
    error = requestError;
  }

  isSavingResponse = false;
  if (error) {
    console.error("Could not save the date response:", error);
    submitAvailability.disabled = false;
    flexibleButton.disabled = false;
    freeDate.disabled = false;
    timePreference.disabled = false;
    extraNote.disabled = false;
    submitAvailability.textContent = "Send this date";
    availabilityNote.textContent = "That didn’t save yet. Check the Supabase setup and try again.";
    return;
  }

  responseWasSaved = true;
  submitAvailability.textContent = "Answer sent";
  availabilityNote.textContent = isFlexible
    ? `I saved your ${chosenDate.textContent.toLowerCase()} choice${timePreference.value === "Any time" ? "" : ` for the ${timePreference.value.toLowerCase()}`}. We can pick a day together, Boluwatife.`
    : `I saved your ${chosenDate.textContent.toLowerCase()} choice for ${formatDate(freeDate.value)}${timePreference.value === "Any time" ? "" : ` in the ${timePreference.value.toLowerCase()}`}. I can’t wait, Boluwatife.`;
}

submitAvailability.addEventListener("click", () => saveDateResponse(false));
flexibleButton.addEventListener("click", () => saveDateResponse(true));
