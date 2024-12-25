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
  const studentIdInput = document.querySelector("[data-input-studentId]");
  const proceedButton = document.querySelector("[data-proceed-btn]");
  const spinnerSection = firstStepContainer.querySelector(
    "[data-spinner-section]"
  );

  function updateUIonProceed() {
    proceedButton.setAttribute("disabled", "true");
    spinnerSection.classList.add("active");
  }

  function updateUItoDefault() {
    proceedButton.removeAttribute("disabled");
    spinnerSection.classList.remove("active");
  }

  function validateStudentId(studentId) {
    const matricPattern = /^UG\/\d{2}\/\d{4}$/;
    const jambPattern = /^\d{8}[A-Z]{2}$/;
    return matricPattern.test(studentId) || jambPattern.test(studentId);
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

  function handleProceed() {
    let studentIdValidationResult = validateStudentId(studentIdInput.value);
    console.log(studentIdValidationResult);
    if (studentIdValidationResult) {
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
  }

  return {
    init: addEventListiners
  };
})();

handleFirstStep.init();
