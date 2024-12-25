//Globals

function computeFormToShow(hide, show) {
  const formToShow = document.querySelector(`[data-step-${show}]`);
  if (formToShow) {
    formToShow.classList.add("active");
  }
  if (hide) {
    hide.classList.remove(hide);
  }
}

const handleFirstStep = (() => {
  const firstStepContainer = document.querySelector("[data-step-first]");
  const studentIdInput = firstStepContainer.querySelector(
    "[data-input-studentId]"
  );
  const proceedButton = firstStepContainer.querySelector("[data-proceed-btn]");
  const spinnerSection = firstStepContainer.querySelector(
    "[data-spinner-section]"
  );
  const studentIdInputError = firstStepContainer.querySelector(
    "[data-error-studentId]"
  );

  function updateUIonProceed() {
    proceedButton.setAttribute("disabled", "true");
    spinnerSection.classList.add("active");
  }

  function updateUItoDefault() {
    proceedButton.removeAttribute("disabled");
    spinnerSection.classList.remove("active");
  }

  function updateUIonError(error) {
    studentIdInputError.textContent = error;
    studentIdInputError.classList.add("text-error-active");
    studentIdInput.classList.add("input-error-active");
    studentIdInput.focus();
  }

  function clearUIError() {
    studentIdInputError.textContent = "";
    studentIdInputError.classList.remove("text-error-active");
    studentIdInput.classList.remove("input-error-active");
  }

  function isValidStudentId(studentId) {
    const matricPattern = /^UG\/\d{2}\/\d{4}$/;
    const jambPattern = /^\d{8}[A-Z]{2}$/;
    return matricPattern.test(studentId) || jambPattern.test(studentId);
  }

  function validateStudentId() {
    if (studentIdInput.value == "") {
      updateUIonError("Student ID is required");
      return false;
    }
    if (!isValidStudentId(studentIdInput.value)) {
      updateUIonError("Student ID does not match the specified format");
      return false;
    }
    return true;
  }

  function checkForStudent() {
    const req = new XMLHttpRequest();
    req.open(
      "GET",
      `http://localhost:5239/student/?studentId=${studentIdInput.value}`,
      true
    );

    req.onload = function () {
      if (this.status == 200) {
        let reponse = JSON.parse(this.response);
        sessionStorage.setItem(
          "currentStudentGeneralData",
          JSON.stringify(this.response)
        );
        updateUItoDefault();
        console.log(reponse);
      } else {
        updateUItoDefault();
        console.log(this.response);
      }
    };
    req.onerror = function () {
      updateUItoDefault();
      console.log(this.response);
    };

    req.send();
  }

  let proceededBefore = false;

  function handleProceed() {
    proceededBefore = true;
    let studentIdValidationResult = validateStudentId(studentIdInput.value);
    if (studentIdValidationResult) {
      clearUIError();
      updateUIonProceed();
      checkForStudent();
    }
  }

  function addEventListiners() {
    proceedButton.addEventListener("click", handleProceed);
    studentIdInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleProceed();
      }
    });
    studentIdInput.addEventListener("input", (e) => {
      if (proceededBefore && validateStudentId(e.target.value)) {
        clearUIError();
      }
    });
  }

  return {
    init: addEventListiners
  };
})();

handleFirstStep.init();
