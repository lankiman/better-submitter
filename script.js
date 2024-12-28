//Globals

const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5239"
    : `http://${window.location.hostname}:5239`;

//general funcions
// function computeFormToShow(hide, show, direction) {
//   const formToShow = document.querySelector(`[data-step-${show}]`);
//   const generalContainer = document.querySelector("[data-container]");
//   generalContainer.classList.add("change-form");
//   formToShow.classList.add("active");
//   if (direction == "next") {
//     hide.classList.add("slide-out");
//     formToShow.classList.add("slide-in");
//     hide.addEventListener("animationend", () => {
//       hide.classList.remove("active");
//       hide.classList.remove("slide-out");
//       formToShow.classList.remove("slide-in");
//       generalContainer.classList.remove("change-form");
//     });
//   }
//   if (direction == "prev") {
//     hide.classList.add("slide-out-right");
//     formToShow.classList.add("slide-in-left");
//     hide.addEventListener("animationend", () => {
//       hide.classList.remove("active");
//       hide.classList.remove("slide-out-right");
//       formToShow.classList.remove("slide-in-left");
//       generalContainer.classList.remove("change-form");
//     });
//   }
// }

const dialogModalHandler = (() => {
  const dialogModal = document.querySelector("[data-dialog-modal]");
  const dialogMessage = dialogModal.querySelector("[data-dailog-message]");
  const dialogCancelButton = dialogModal.querySelector(
    "[data-dialog-cancel-button]"
  );
  const dialogConfirmButton = dialogModal.querySelector(
    "[data-dialog-confirm-button]"
  );

  function closeDialog() {
    dialogModal.classList.remove("toast-in");
    dialogModal.classList.add("toast-out");
    dialogModal.addEventListener(
      "animationend",
      () => {
        dialogModal.close();
      },
      { once: true }
    );
  }

  function initializeEventListiners() {
    dialogCancelButton.addEventListener("click", closeDialog);
  }

  function displayDialog(message, action) {
    dialogModal.classList.remove("toast-out");
    dialogModal.classList.add("toast-in");
    dialogModal.showModal();
    dialogMessage.textContent = message;
    dialogConfirmButton.addEventListener(
      "click",
      () => {
        action();
        closeDialog();
      },
      { once: true }
    );
  }

  return {
    init: initializeEventListiners,
    showDialog: displayDialog
  };
})();
dialogModalHandler.init();

const generalHandler = (() => {
  const generalContainer = document.querySelector("[data-container]");

  const dynamicContent = generalContainer.lastElementChild;
  const staticContent = generalContainer.firstElementChild;

  // Function to calculate the total height (static + dynamic)
  function getTotalHeight() {
    // Static height: including header, footer, and any padding/borders
    const staticHeight =
      staticContent.offsetHeight +
      parseFloat(window.getComputedStyle(generalContainer).paddingTop) +
      parseFloat(window.getComputedStyle(generalContainer).paddingBottom);

    // Dynamic height: height of the content that changes
    const dynamicHeight = dynamicContent.scrollHeight;

    // Return the total height (static + dynamic)
    return staticHeight + dynamicHeight;
  }

  const resizeObserver = new ResizeObserver(() => {
    const totalHeight = getTotalHeight();
    generalContainer.style.height = `${totalHeight}px`; // Update max-height based on the total height
  });

  resizeObserver.observe(dynamicContent);
})();

function showDialog(message, action) {
  dialogModalHandler.showDialog(message, action);
}

function computeFormToShow(hide, show, direction) {
  const formToShow = document.querySelector(`[data-step-${show}]`);
  const generalContainer = document.querySelector("[data-container]");
  generalContainer.classList.add("change-form");
  formToShow.classList.add("active");
  // generalContainer.style.height = `${formToShow.scrollHeight * 1.4}px`;

  const animationEndHandler = () => {
    hide.classList.remove(
      "active",
      direction === "next" ? "slide-out" : "slide-out-right"
    );
    formToShow.classList.remove(
      direction === "next" ? "slide-in" : "slide-in-left"
    );
    generalContainer.classList.remove("change-form");
    hide.removeEventListener("animationend", animationEndHandler);
  };

  if (direction === "next") {
    hide.classList.add("slide-out");
    formToShow.classList.add("slide-in");
    hide.addEventListener("animationend", animationEndHandler);
  } else if (direction === "prev") {
    hide.classList.add("slide-out-right");
    formToShow.classList.add("slide-in-left");
    hide.addEventListener("animationend", animationEndHandler);
  }
}

function getCurrentStudentId() {
  const id = handleFirstStep.getCurrentStudentId();
  return id;
}

function showToast(message, type) {
  return handleToastMessage.displayToast(message, type);
}

//handle toast message

// const handleToastMessage = (() => {
//   const toastTemplate = document.querySelector("[data-toast-template]");
//   const toastPlaceholder = document.querySelector("[data-toast-placeholder]");

//   function updateToastContainerHeight() {
//     let totalHeight = 0;
//     Array.from(toastPlaceholder.children).forEach((toast) => {
//       totalHeight += toast.offsetHeight;
//     });
//     toastPlaceholder.style.height = `${totalHeight}px`;
//   }

//   function displayToast(message, type) {
//     const toastTemplateContent = toastTemplate.content.cloneNode(true);
//     const toastMessageIcon = toastTemplateContent.querySelector(
//       `[data-toast-icon-type-${type}]`
//     );
//     const toastMessage = toastTemplateContent.querySelector(
//       "[data-toast-message]"
//     );
//     const toastCloseButton = toastTemplateContent.querySelector(
//       "[data-toast-close-button]"
//     );

//     toastMessageIcon.classList.add("active");
//     toastMessage.textContent = message;
//     toastPlaceholder.appendChild(toastTemplateContent);
//     const appendedToast = toastPlaceholder.lastElementChild;
//     appendedToast.dataset.toastType = type;
//     console.log(appendedToast);
//     appendedToast.classList.add("toast-in");

//     if (toastPlaceholder.children.length > 0) {
//       toastPlaceholder.classList.add("active");
//     }

//     updateToastContainerHeight();

//     toastCloseButton.addEventListener("click", () => {
//       appendedToast.classList.remove("toast-in");
//       appendedToast.classList.add("toast-out");
//       appendedToast.addEventListener(
//         "animationend",
//         () => {
//           toastPlaceholder.removeChild(appendedToast);
//           updateToastContainerHeight();
//           if (toastPlaceholder.children.length < 1) {
//             toastPlaceholder.classList.remove("active");
//           }
//         },
//         { once: true }
//       );
//     });

//     setTimeout(() => {
//       appendedToast.classList.remove("toast-in");
//       appendedToast.classList.add("toast-out");
//       appendedToast.addEventListener("animationend", () => {
//         toastPlaceholder.removeChild(appendedToast);
//         updateToastContainerHeight();
//         if (toastPlaceholder.children.length < 1) {
//           toastPlaceholder.classList.remove("active");
//         }
//       });
//     }, 4000);
//   }

//   return {
//     displayToast: displayToast
//   };
// })();

const handleToastMessage = (() => {
  const toastTemplate = document.querySelector("[data-toast-template]");
  const toastPlaceholder = document.querySelector("[data-toast-placeholder]");

  function updateToastContainerHeight() {
    // Calculate the total height of all toasts in the container
    let totalHeight = 0;
    Array.from(toastPlaceholder.children).forEach((toast) => {
      totalHeight += toast.offsetHeight;
    });

    // Update the height of the toastPlaceholder to fit the total height of all toasts
    toastPlaceholder.style.height = `${totalHeight}px`;
  }

  function displayToast(message, type) {
    const toastTemplateContent = toastTemplate.content.cloneNode(true);
    const toastMessageIcon = toastTemplateContent.querySelector(
      `[data-toast-icon-type-${type}]`
    );
    const toastMessage = toastTemplateContent.querySelector(
      "[data-toast-message]"
    );
    const toastCloseButton = toastTemplateContent.querySelector(
      "[data-toast-close-button]"
    );

    toastMessageIcon.classList.add("active");
    toastMessage.textContent = message;
    toastPlaceholder.appendChild(toastTemplateContent);
    const appendedToast = toastPlaceholder.lastElementChild;
    appendedToast.dataset.toastType = type;
    appendedToast.classList.add("toast-in");

    if (toastPlaceholder.children.length > 0) {
      toastPlaceholder.classList.add("active");
    }

    // Update the container height after adding a toast
    updateToastContainerHeight();

    // Handle close button click
    toastCloseButton.addEventListener("click", () => {
      closeToast(appendedToast);
    });

    // Auto-remove after 4 seconds
    setTimeout(() => {
      closeToast(appendedToast);
    }, 4000);
  }

  function closeToast(toast) {
    toast.classList.remove("toast-in");
    toast.classList.add("toast-out");

    // Use animationend event to remove the toast after the animation completes
    toast.addEventListener(
      "animationend",
      () => {
        toastPlaceholder.removeChild(toast);
        updateToastContainerHeight(); // Update height after toast is removed
        if (toastPlaceholder.children.length < 1) {
          toastPlaceholder.classList.remove("active");
        }
      },
      { once: true }
    );
  }

  return {
    displayToast
  };
})();

//handle first step

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

  //   function checkForStudentReqeust() {
  //     const req = new XMLHttpRequest();
  //     req.open(
  //       "GET",
  //       `http://localhost:5239/student/?studentId=${studentIdInput.value}`,
  //       true
  //     );

  //     req.onload = function () {
  //       if (this.status == 200) {
  //         let response = JSON.parse(this.response);
  //         sessionStorage.setItem(
  //           "currentStudentGeneralData",
  //           JSON.stringify(this.response)
  //         );
  //         updateUItoDefault();
  //         console.log(response);
  //         return response;
  //       } else {
  //         updateUItoDefault();
  //         console.log(this.response);
  //         return JSON.parse(this.response);
  //       }
  //     };
  //     req.onerror = function () {
  //       updateUItoDefault();
  //       console.log(this.response);
  //       return JSON.parse(this.response);
  //     };

  //     req.send();
  //   }

  //   let proceededBefore = false;

  //   async function handleProceed() {
  //     proceededBefore = true;
  //     let studentIdValidationResult = validateStudentId(studentIdInput.value);
  //     if (studentIdValidationResult) {
  //       clearUIError();
  //       updateUIonProceed();
  //       var response = await checkForStudentReqeust();
  //       console.log(response);
  //       if (response.status == "NotPresent") {
  //         computeFormToShow(firstStepContainer, "student-details");
  //       }
  //     }
  //   }

  function checkForStudentRequest() {
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open(
        "GET",
        `${API_BASE_URL}/student/?studentId=${studentIdInput.value}`,
        true
      );

      req.onload = function () {
        if (this.status == 200) {
          let response = JSON.parse(this.response);
          sessionStorage.setItem(
            "currentStudentGeneralData",
            JSON.stringify(response)
          );
          updateUItoDefault();
          console.log(response);
          resolve(response);
        } else {
          updateUItoDefault();
          console.log(this.response);
          reject(JSON.parse(this.response));
        }
      };

      req.onerror = function () {
        updateUItoDefault();
        console.log(this.response);
        reject(JSON.parse(this.response));
      };

      req.send();
    });
  }

  let proceededBefore = false;

  async function handleProceed() {
    proceededBefore = true;
    let studentIdValidationResult = validateStudentId(studentIdInput.value);
    if (studentIdValidationResult) {
      clearUIError();
      updateUIonProceed();

      try {
        var response = await checkForStudentRequest();
        console.log(response);
        if (response.status == "NotPresent") {
          computeFormToShow(firstStepContainer, "student-details", "next");
        }
      } catch (error) {
        console.error("Error checking for student request:", error);
      }
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
    init: addEventListiners,
    getCurrentStudentId: function () {
      return studentIdInput.value;
    }
  };
})();

handleFirstStep.init();

// handle student details

const handleStudentDetailsStep = (() => {
  const studentDetailsStepContainer = document.querySelector(
    "[data-step-student-details]"
  );

  const proceedButton =
    studentDetailsStepContainer.querySelector("[data-proceed-btn]");
  const spinnerSection = studentDetailsStepContainer.querySelector(
    "[data-spinner-section]"
  );

  const backButton =
    studentDetailsStepContainer.querySelector("[data-back-button]");

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

    if (Object.keys(errors).length === 0) {
      return true;
    } else {
      return false;
    }
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

  function focusNextInputFieldOrSubmitOnEnter(inputField) {
    const currentIndex = Array.from(studentDataInputFields).indexOf(inputField);
    if (currentIndex < studentDataInputFields.length - 1) {
      Array.from(studentDataInputFields)[currentIndex + 1].focus();
    } else {
      handleStudentDataProceed();
    }
  }

  function convertInputDataToRequestBodyData(inputFields) {
    let requestData = {};
    inputFields.forEach((input) => {
      const key = input.name.charAt(0).toUpperCase() + input.name.slice(1);
      requestData[key] = input.value;
    });
    const id = getCurrentStudentId();
    requestData["StudentId"] = id;
    return requestData;
  }

  function submitStudentDetailsRequest(data) {
    const req = new XMLHttpRequest();
    const requestData = convertInputDataToRequestBodyData(data);
    req.open("POST", `${API_BASE_URL}/student`, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.onload = function () {
      if (this.status == 200) {
        let reponse = JSON.parse(this.response);
        updateUItoDefault();
        console.log(reponse);
        if (reponse.status == "Present") {
          showToast(reponse.message, "info");
        } else {
          showToast(reponse.message, "success");
        }
      } else {
        updateUItoDefault();
        console.log(this.response);
      }
    };
    req.onerror = function () {
      updateUItoDefault();
      console.log(this.response);
    };

    req.send(JSON.stringify(requestData));
  }

  let proceededBefore = false;
  let dialogShownBefore = false;

  function handleSubmissionConfirm() {
    updateUIonProceed();
    submitStudentDetailsRequest(studentDataInputFields);
    dialogShownBefore = true;
  }

  function handleStudentDataProceed() {
    proceededBefore = true;
    const isValidData = validateStudentDetails(studentDataInputFields);
    if (isValidData && dialogShownBefore == false) {
      showDialog(
        "Please make sure entered data is correct before proceeding, data once submitted cannot be updated",
        handleSubmissionConfirm
      );
    }
    if (isValidData && dialogShownBefore == true) {
      handleSubmissionConfirm();
    }
  }

  function addEventListiners() {
    proceedButton.addEventListener("click", handleStudentDataProceed);
    studentDataInputFields.forEach((field) => {
      field.addEventListener("input", (event) => {
        if (proceededBefore) {
          validateSingleStudentDetailsField(event.target);
        }
      });
    });

    studentDataInputFields.forEach((field) => {
      field.addEventListener("keydown", (event) => {
        if (event.key == "Enter") {
          event.preventDefault();
          focusNextInputFieldOrSubmitOnEnter(event.target);
        }
      });
    });
    backButton.addEventListener("click", () => {
      dialogShownBefore = false;
      proceededBefore = false;
      computeFormToShow(studentDetailsStepContainer, "first", "prev");
      resetStudentDataErrorMessageFields({}, studentDataInputFields);
    });
  }
  return {
    init: addEventListiners
  };
})();

handleStudentDetailsStep.init();
[];

//choose course form step logic

const handleChooseCourseStep = (() => {
  const chooseCourseStepContainer = document.querySelector(
    "[data-step-choose-course]"
  );
  const backButton =
    chooseCourseStepContainer.querySelector("[data-back-button]");

  const studentNameHeader = chooseCourseStepContainer.querySelector(
    "[data-course-student-name]"
  );

  const chooseCourseErrorMessageField = chooseCourseStepContainer.querySelector(
    "[data-error-course]"
  );

  const chooseCourseDropdown = chooseCourseStepContainer.querySelector(
    "[data-course-choice-dropdown]"
  );

  const proceedButton = chooseCourseStepContainer.querySelector(
    "[data-proceed-button]"
  );

  const spinnerSection = chooseCourseStepContainer.querySelector(
    "[data-spinner-section]"
  );

  function getCourseAssignmentMetadata(requestData) {
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open(
        "GET",
        `${API_BASE_URL}/?studentId=${requestData.studentId}?assigmentType=${requestData.assignmentType}`,
        true
      );

      req.onload = function () {
        if (this.response.status == 200) {
          console.log(this.response);
          resolve(JSON.parse(this.response));
        } else {
          console.log(this.response);
          reject(JSON.parse(this.response));
        }
      };
      req.onerror = function () {
        console.log(this.response);
        reject(JSON.parse(this.response));
      };
    });
  }

  function computeRequestData(value) {
    let requestData = {};
    requestData["studentId"] = getCurrentStudentId();
    requestData["assignmentType"] = value;
    return requestData;
  }

  function validateChooseCourseDropdown(value) {
    if (value == "") {
      chooseCourseErrorMessageField.classList.add("active");
      chooseCourseErrorMessageField.textContent = "Please choose a course";
      chooseCourseDropdown.classList.add("input-error-active");
      return false;
    } else {
      chooseCourseErrorMessageField.classList.remove("active");
      chooseCourseErrorMessageField.textContent = "";
      chooseCourseDropdown.classList.remove("input-error-active");
      return true;
    }
  }
})();
