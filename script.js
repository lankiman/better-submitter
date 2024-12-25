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
    studentIdInputError.classList.add("active");
    studentIdInput.classList.add("input-error-active");
    studentIdInput.focus();
  }

  function clearUIError() {
    studentIdInputError.textContent = "";
    studentIdInputError.classList.remove("active");
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

const handleStudentDetailsStep = (() => {
  const studentDetailsStepContainer = document.querySelector(
    "[data-step-student-details]"
  );

  const proceedButton =
    studentDetailsStepContainer.querySelector("[data-proceed-btn]");
  const spinnerSection = studentDetailsStepContainer.querySelector(
    "[data-spinner-section]"
  );

  const studentDataInputFields =
    studentDetailsStepContainer.querySelectorAll(".text-input");

  function updateUIonProceed() {
    proceedButton.setAttribute("disabled", "true");
    spinnerSection.classList.add("active");
  }
  function updateUItoDefault() {
    proceedButton.removeAttribute("disabled");
    spinnerSection.classList.remove("active");
  }

  function populateStudentDataError(data) {
    let errors = {};
    data.forEach((element) => {
      if (element.name == "firstname" && element.value == "") {
        errors = { ...errors, firstname: "Firstname field is required" };
      }
      if (element.name == "surname" && element.value == "") {
        errors = { ...errors, surname: "Surnname field is required" };
      }
      if (element.name == "department" && element.value == "") {
        errors = { ...errors, department: "Please choose a department" };
      }
    });
    return errors;
  }

  function populateStudentDataErrorMessageFields(errors) {
    Object.entries(errors).forEach(([key, value]) => {
      studentDetailsStepContainer.querySelector(
        `[data-error-${key}]`
      ).textContent = value;
      studentDetailsStepContainer
        .querySelector(`[data-error-${key}]`)
        .classList.add("active");

      studentDetailsStepContainer
        .querySelector(`[data-input-${key}]`)
        .classList.add("input-error-active");
    });
  }

  function resetStudentDataErrorMessageFields(errors, fields) {
    const errorElements = studentDetailsStepContainer.querySelectorAll(
      "[data-student-details-error-message-field]"
    );

    let keys = Object.keys(errors);
    errorElements.forEach((errorElement) => {
      const key = errorElement.id.split("-")[0];
      if (!errors.hasOwnProperty(key)) {
        errorElement.textContent = "";
        errorElement.classList.remove("active");
      }
    });

    fields.forEach((field) => {
      if (!keys.includes(field.id.split("-")[0])) {
        field.classList.remove("input-error-active");
      }
    });
  }

  function validateStudentDetails(data) {
    let errors = populateStudentDataError(data);
    populateStudentDataErrorMessageFields(errors);
    resetStudentDataErrorMessageFields(errors, data);
    if (errors) {
      return false;
    }
    return true;
  }

  function updateSingleDetailsFieldErrorMessage(
    inputField,
    messageField,
    message
  ) {
    inputField.classList.add("input-error-active");
    messageField.textContent = message;
    messageField.classList.add("active");
  }
  function resetSingleDetailsFieldErrorMessage(inputField, messageField) {
    inputField.classList.remove("input-error-active");
    messageField.textContent = "";
    messageField.classList.remove("active");
  }

  function validateSingleStudentDetailsField(inputField) {
    const fieldName = inputField.id.split("-")[0];
    const messageField = studentDetailsStepContainer.querySelector(
      `[data-error-${fieldName}]`
    );

    if (fieldName == "firstname" && inputField.value == "") {
      updateSingleDetailsFieldErrorMessage(
        inputField,
        messageField,
        "Firstname field is required"
      );
    }

    if (fieldName == "surname" && inputField.value == "") {
      updateSingleDetailsFieldErrorMessage(
        inputField,
        messageField,
        "Surnname field is required"
      );
    }

    if (fieldName == "department" && inputField.value == "") {
      updateSingleDetailsFieldErrorMessage(
        inputField,
        messageField,
        "Department field is required"
      );
    }

    if (inputField.value) {
      resetSingleDetailsFieldErrorMessage(inputField, messageField);
    }
  }
  let proceededBefore = false;

  function handleStudentDataProceed() {
    proceededBefore = true;
    updateUIonProceed();
    const isValidData = validateStudentDetails(studentDataInputFields);
    if (!isValidData) {
      updateUItoDefault();
    }
  }

  function addEventListiners() {
    proceedButton.addEventListener("click", handleStudentDataProceed);
    studentDataInputFields.forEach((field) => {
      field.addEventListener("input", (e) => {
        if (proceededBefore) {
          validateSingleStudentDetailsField(field);
        }
      });
    });
  }
  return {
    init: addEventListiners
  };
})();

handleStudentDetailsStep.init();
