const API_BASE_URL = import.meta.env.VITE_API_URL;

//global state variables and functions

const createStateManager = (initialState = null, isDynamic = false) => {
  let state = initialState;
  // Store initialState type and value for proper reset
  const initialType = typeof initialState;
  const isMap = initialState instanceof Map;

  const subscribers = [];

  return {
    getState() {
      return state;
    },

    setState(newState) {
      if (
        isDynamic &&
        typeof state === "object" &&
        typeof newState === "object"
      ) {
        state = { ...state, ...newState };
      } else {
        state = newState;
      }
      subscribers.forEach((fn) => fn(state));
    },

    subscribe(fn) {
      subscribers.push(fn);
      return () => {
        const index = subscribers.indexOf(fn);
        subscribers.splice(index, 1);
      };
    },

    resetState() {
      // Handle different types of initial states
      let resetValue;

      if (isMap) {
        resetValue = new Map();
      } else if (initialType === "object" && initialState !== null) {
        resetValue = Array.isArray(initialState) ? [] : {};
      } else {
        resetValue = initialState;
      }

      this.setState(resetValue);
    }
  };
};

const userState = createStateManager(null);
const userIdState = createStateManager("");
const selectedCourseState = createStateManager("Python");
const assignmentMetaDataState = createStateManager({});
const codeFileValidationErrorState = createStateManager(new Map());
const videoFileValidationErrorState = createStateManager(new Map());
const uploadChoiceState = createStateManager("code");
const selectedCodeFilesState = createStateManager(new Map());
const selectedVideoFilesState = createStateManager(new Map());
const codeFileNumberButtons = new Map();
const videoFileNumberButtons = new Map();
const maxVideoFileSize = 100 * 1024 * 1024; // 100 MB
const maxCodeFileSize = 1 * 1024 * 1024; // 1 MB

let codeAssignmentNumberPicker = null;
let videoAssignmentNumberPicker = null;

assignmentMetaDataState.subscribe(
  ({
    maxAssignmentNumber,
    notSubmittableCodeFiles,
    notSubmittableVideoFiles
  }) => {
    codeAssignmentNumberPicker = createNumberPicker(
      "code",
      maxAssignmentNumber,
      notSubmittableCodeFiles
    );

    videoAssignmentNumberPicker = createNumberPicker(
      "video",
      maxAssignmentNumber,
      notSubmittableVideoFiles
    );
  }
);

function isValidStudentId(studentId) {
  const matricPattern = /^UG\/\d{2}\/\d{4}$/;
  const jambPattern = /^\d{12}[A-Z]{2}$/;
  return matricPattern.test(studentId) || jambPattern.test(studentId);
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 bytes";

  const units = ["bytes", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
};

function computeAssignmentMetaDataRequestData(value) {
  let requestData = {};
  requestData["studentId"] = getCurrentStudentId();
  requestData["assignmentType"] = value;
  return requestData;
}

function updateAssignmentMetaDataState(data) {
  assignmentMetaDataState.setState(data);
}

async function fetchAndUpdateAssignmentMetaDataState(data) {
  try {
    const result = await getCourseAssignmentMetadata(data);
    updateAssignmentMetaDataState(result.data);
    return result;
  } catch (error) {
    console.log("error fetching an assignment data", error);
    showToast("An error eccured", "error");
    resetFormStepToDefault();
  }
}

function setCurrentStudentData(data) {
  userState.setState(data);
  sessionStorage.setItem("currentStudentGeneralData", JSON.stringify(data));
}

function getCurrentStudentId() {
  return userIdState.getState();
}

function getCurrentUserDepartment() {
  return userState.getState().department;
}

//general funcions
const dialogModalHandler = (() => {
  const dialogModal = document.querySelector("[data-dialog-modal]");
  const dialogMessage = dialogModal.querySelector("[data-dailog-message]");
  const dialogCancelButton = dialogModal.querySelector(
    "[data-dialog-cancel-button]"
  );
  const dialogConfirmButton = dialogModal.querySelector(
    "[data-dialog-confirm-button]"
  );

  let handleConfirmClick = null;

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

    if (handleConfirmClick) {
      dialogConfirmButton.removeEventListener("click", handleConfirmClick);
    }
  }

  function initializeEventListiners() {
    dialogCancelButton.addEventListener("click", closeDialog);
  }

  function displayDialog(message, action) {
    dialogModal.classList.remove("toast-out");
    dialogModal.classList.add("toast-in");
    dialogModal.showModal();
    dialogMessage.textContent = message;

    handleConfirmClick = () => {
      action();
      closeDialog();
    };

    dialogConfirmButton.addEventListener("click", handleConfirmClick);
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
  // function getTotalHeight() {
  //   // Static height: including header, footer, and any padding/borders
  //   const staticHeight =
  //     staticContent.offsetHeight +
  //     parseFloat(window.getComputedStyle(generalContainer).paddingTop) +
  //     parseFloat(window.getComputedStyle(generalContainer).paddingBottom);

  //   // Dynamic height: height of the content that changes
  //   const dynamicHeight = dynamicContent.offsetHeight;

  //   console.log(dynamicContent.offsetHeight);
  //   console.log(dynamicContent.scrollHeight);

  //   console.log(dynamicHeight);
  //   console.log(staticHeight);

  //   return staticHeight + dynamicHeight;

  //   // Return the total height (static + dynamic)
  // }
  function getTotalHeight() {
    const minHeight = 350; // Set your desired minimum height
    const staticHeight =
      staticContent.offsetHeight +
      parseFloat(window.getComputedStyle(generalContainer).paddingTop) +
      parseFloat(window.getComputedStyle(generalContainer).paddingBottom);

    const dynamicHeight = dynamicContent.offsetHeight;

    return Math.max(staticHeight + dynamicHeight, minHeight);
  }

  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      const totalHeight = getTotalHeight();
      generalContainer.style.height = `${totalHeight}px`;
    });
  });

  resizeObserver.observe(dynamicContent);
})();

function showDialog(message, action) {
  dialogModalHandler.showDialog(message, action);
}

function resetFormStepToDefault() {
  const formSteps = document.querySelectorAll(".form-step");
  const formToHide = Array.from(formSteps).filter((formStep) =>
    formStep.classList.contains("active")
  );
  computeFormToShow(formToHide[0], "first", "prev");
}

// function computeFormToShow(hide, show, direction) {
//   const formToShow = document.querySelector(`[data-step-${show}]`);
//   const generalContainer = document.querySelector("[data-container]");
//   generalContainer.classList.add("change-form");
//   formToShow.classList.add("active");
//   const animationEndHandler = () => {
//     hide.classList.remove(
//       "active",
//       direction === "next" ? "slide-out" : "slide-out-right"
//     );
//     formToShow.classList.remove(
//       direction === "next" ? "slide-in" : "slide-in-left"
//     );
//     generalContainer.classList.remove("change-form");
//     hide.removeEventListener("animationend", animationEndHandler);
//   };

//   if (direction === "next") {
//     hide.classList.add("slide-out");
//     formToShow.classList.add("slide-in");
//     hide.addEventListener("animationend", animationEndHandler);
//   } else if (direction === "prev") {
//     hide.classList.add("slide-out-right");
//     formToShow.classList.add("slide-in-left");
//     hide.addEventListener("animationend", animationEndHandler);
//   }
// }

// function computeFormToShow(hide, show, direction) {
//   const formToShow = document.querySelector(`[data-step-${show}]`);
//   const generalContainer = document.querySelector("[data-container]");

//   generalContainer.classList.add("change-form");

//   requestAnimationFrame(() => {
//     formToShow.classList.add("active");

//     const animationEndHandler = () => {
//       requestAnimationFrame(() => {
//         hide.classList.remove(
//           "active",
//           direction === "next" ? "slide-out" : "slide-out-right"
//         );
//         formToShow.classList.remove(
//           direction === "next" ? "slide-in" : "slide-in-left"
//         );
//         generalContainer.classList.remove("change-form");
//         hide.removeEventListener("animationend", animationEndHandler);
//       });
//     };

//     if (direction === "next") {
//       hide.classList.add("slide-out");
//       formToShow.classList.add("slide-in");
//       hide.addEventListener("animationend", animationEndHandler);
//     } else if (direction === "prev") {
//       hide.classList.add("slide-out-right");
//       formToShow.classList.add("slide-in-left");
//       hide.addEventListener("animationend", animationEndHandler);
//     }
//   });
// }

function showToast(message, type) {
  return handleToastMessage.displayToast(message, type);
}

function getCourseAssignmentMetadata(requestData) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(
      "GET",
      `${API_BASE_URL}/student/?studentId=${requestData.studentId}&assignmentType=${requestData.assignmentType}`,
      true
    );

    req.onload = function () {
      if (req.status == 200) {
        let response = JSON.parse(req.responseText);
        resolve(response);
      } else {
        reject(req.responseType);
      }
    };

    req.onerror = function () {
      reject(this.responseText);
    };

    req.send();
  });
}

const handleToastMessage = (() => {
  const toastTemplate = document.querySelector("[data-toast-template]");
  const toastPlaceholder = document.querySelector("[data-toast-placeholder]");

  function updateToastContainerHeight() {
    requestAnimationFrame(() => {
      let totalHeight = 0;
      Array.from(toastPlaceholder.children).forEach((toast) => {
        totalHeight += toast.offsetHeight;
      });
      toastPlaceholder.style.height = `${totalHeight}px`;
    });
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

    requestAnimationFrame(() => {
      toastPlaceholder.appendChild(toastTemplateContent);
      const appendedToast = toastPlaceholder.lastElementChild;
      appendedToast.dataset.toastType = type;
      appendedToast.classList.add("toast-in");

      if (toastPlaceholder.children.length > 0) {
        toastPlaceholder.classList.add("active");
      }

      updateToastContainerHeight();

      toastCloseButton.addEventListener("click", () => {
        closeToast(appendedToast);
      });

      setTimeout(() => {
        closeToast(appendedToast);
      }, 4000);
    });
  }

  function closeToast(toast) {
    requestAnimationFrame(() => {
      toast.classList.remove("toast-in");
      toast.classList.add("toast-out");

      toast.addEventListener(
        "animationend",
        () => {
          requestAnimationFrame(() => {
            toastPlaceholder.removeChild(toast);
            updateToastContainerHeight();
            if (toastPlaceholder.children.length < 1) {
              toastPlaceholder.classList.remove("active");
            }
          });
        },
        { once: true }
      );
    });
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

  function validateStudentId(value) {
    if (value == "") {
      updateUIonError("Student ID is required");
      return false;
    }
    if (!isValidStudentId(value)) {
      updateUIonError("Student ID does not match the specified format");
      return false;
    }
    return true;
  }

  function checkForStudentRequest(studentId) {
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open("GET", `${API_BASE_URL}/student/?studentId=${studentId}`, true);

      req.onload = function () {
        if (req.status == 200) {
          let response = JSON.parse(req.responseText);
          resolve(response);
        } else {
          reject(JSON.parse(req.responseType));
        }
      };

      req.onerror = function () {
        reject(this.responseText);
      };

      req.send();
    });
  }

  let proceededBefore = false;

  async function handleProceed() {
    proceededBefore = true;
    const studentIdValidationResult = validateStudentId(studentIdInput.value);
    if (studentIdValidationResult) {
      clearUIError();
      updateUIonProceed();
      userIdState.setState(studentIdInput.value);
      try {
        var response = await checkForStudentRequest(studentIdInput.value);
        updateUItoDefault();
        if (response.status == "Present") {
          setCurrentStudentData(response.data);
        }
        if (response.status == "NotPresent") {
          computeFormToShow(firstStepContainer, "student-details", "next");
        }
        if (
          response.status == "Present" &&
          response.data.department == "Electrical"
        ) {
          computeFormToShow(firstStepContainer, "choose-course", "next");
        } else if (
          response.status == "Present" &&
          response.data.department !== "Electrical"
        ) {
          const metaDataRequestData = computeAssignmentMetaDataRequestData(
            selectedCourseState.getState()
          );
          fetchAndUpdateAssignmentMetaDataState(metaDataRequestData);
          computeFormToShow(firstStepContainer, "file-upload", "next");
        }
        proceededBefore = false;
      } catch (error) {
        updateUItoDefault();
        showToast("An error occcured", "error");
        console.error("Error checking for student request:", error);
      }
    }
  }

  function addEventListiners() {
    // proceedButton.addEventListener("click", handleProceed);
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

  function isValidName(name) {
    const namePattern = /^[A-Za-z]+(-[A-Za-z]+)*$/;
    return namePattern.test(name.trim());
  }
  function isEmpty(value) {
    return value.trim() == "";
  }

  const nameErrorMessage =
    "Names can only contain letters and hyphens (-), and cannot start with hypens";

  function populateStudentDataError(data) {
    let errors = {};
    data.forEach((element) => {
      const { name, value } = element;

      if (name === "firstname") {
        if (isEmpty(value)) {
          errors.firstname = "Firstname field is required";
        } else if (!isValidName(value)) {
          errors.firstname = nameErrorMessage;
        }
      }

      if (name === "surname") {
        if (isEmpty(value)) {
          errors.surname = "Surname field is required";
        } else if (!isValidName(value)) {
          errors.surname = nameErrorMessage;
        }
      }

      if (name === "middlename" && !isEmpty(value) && !isValidName(value)) {
        errors.middlename = nameErrorMessage;
      }

      if (name === "department" && isEmpty(value)) {
        errors.department = "Please choose a department";
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
    const value = inputField.value;
    const messageField = studentDetailsStepContainer.querySelector(
      `[data-error-${fieldName}]`
    );

    const requiredFields = ["firstname", "surname", "department"];
    const nameFields = ["firstname", "surname", "middlename"];

    if (requiredFields.includes(fieldName) && isEmpty(value)) {
      updateSingleDetailsFieldErrorMessage(
        inputField,
        messageField,
        `${capitalize(fieldName)} field is required`
      );
      return;
    }

    if (
      nameFields.includes(fieldName) &&
      !isEmpty(value) &&
      !isValidName(value)
    ) {
      updateSingleDetailsFieldErrorMessage(
        inputField,
        messageField,
        nameErrorMessage
      );
      return;
    }

    resetSingleDetailsFieldErrorMessage(inputField, messageField);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      req.open("POST", `${API_BASE_URL}/student`, true);
      req.setRequestHeader("Content-Type", "application/json");
      req.onload = function () {
        if (req.status === 200) {
          let response = JSON.parse(req.responseText);
          resolve(response);
        } else {
          reject(JSON.parse(req.responseText));
        }
      };
      req.onerror = function () {
        reject(this.responseText);
      };
      req.send(JSON.stringify(data));
    });
  }

  let proceededBefore = false;
  let dialogShownBefore = false;
  async function submitStudentDetailsRequestAction(data) {
    try {
      const response = await submitStudentDetailsRequest(data);
      console.log(response);
      if (response.status == "Present") {
        showToast(response.message, "info");
        proceededBefore = false;
        dialogShownBefore = false;
      } else {
        proceededBefore = false;
        dialogShownBefore = false;
        showToast(response.message, "success");
        setCurrentStudentData(response.data);
        if (response.data.department === "Electrical") {
          computeFormToShow(
            studentDetailsStepContainer,
            "choose-course",
            "next"
          );
        } else {
          computeFormToShow(studentDetailsStepContainer, "file-upload", "next");
          const metaDataRequestData = computeAssignmentMetaDataRequestData(
            selectedCourseState.getState()
          );
          fetchAndUpdateAssignmentMetaDataState(metaDataRequestData);
        }
      }
      updateUItoDefault();
    } catch (error) {
      updateUItoDefault();
      console.error(error);
      showToast("An error occured", "error");
    }
  }

  function handleSubmissionConfirm() {
    updateUIonProceed();
    const requestData = convertInputDataToRequestBodyData(
      studentDataInputFields
    );
    submitStudentDetailsRequestAction(requestData);
  }

  function handleStudentDataProceed() {
    proceededBefore = true;
    const isValidData = validateStudentDetails(studentDataInputFields);
    if (isValidData && dialogShownBefore == false) {
      showDialog(
        "Please make sure entered data is correct before proceeding, data once submitted cannot be updated",
        handleSubmissionConfirm
      );
      dialogShownBefore = true;
    } else if (isValidData && dialogShownBefore == true) {
      handleSubmissionConfirm();
    }
  }

  function addEventListiners() {
    proceedButton.addEventListener("click", handleStudentDataProceed);
    studentDataInputFields.forEach((field) => {
      field.addEventListener("input", (event) => {
        console.log(proceededBefore);
        if (proceededBefore) {
          console.log("triggerd");
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

  const proceedButton =
    chooseCourseStepContainer.querySelector("[data-proceed-btn]");

  const spinnerSection = chooseCourseStepContainer.querySelector(
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

  const userStateUnsubscribe = userState.subscribe((user) => {
    studentNameHeader.textContent = `Welcome ${user.firstname}`;
  });

  let proceededBefore = false;

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

  function handleChooseCourseProceed(value) {
    proceededBefore = true;
    const isValidChoice = validateChooseCourseDropdown(value);
    if (isValidChoice) {
      selectedCourseState.setState(value);
      updateUIonProceed();
      const requestData = computeAssignmentMetaDataRequestData(value);
      fetchAndUpdateAssignmentMetaDataState(requestData)
        .then((result) => {
          proceededBefore = false;
          updateUItoDefault();
          computeFormToShow(chooseCourseStepContainer, "file-upload", "next");
        })
        .catch((error) => {
          updateUItoDefault();
        });
    }
  }

  function initializeEventListiners() {
    proceedButton.addEventListener("click", () =>
      handleChooseCourseProceed(chooseCourseDropdown.value)
    );

    chooseCourseDropdown.addEventListener("input", (event) => {
      if (proceededBefore) {
        validateChooseCourseDropdown(event.target.value);
      }
    });

    backButton.addEventListener("click", () => {
      computeFormToShow(chooseCourseStepContainer, "first", "prev");
    });
  }

  return {
    init: initializeEventListiners
  };
})();

handleChooseCourseStep.init();

//Handle Files Selection Logic

const createModalFactory = () => {
  function createModal(type) {
    const modal = document.createElement("div");
    modal.className = "assignment-number-picker-modal";
    modal.innerHTML = `
            <div class="assigment-number-picker-grid" data-assigment-number-picker-grid></div>
        `;
    modal.dataset.pickerType = type;
    document.body.appendChild(modal);
    return modal;
  }

  function initializeNumbers(modal, maxNumber) {
    const grid = modal.querySelector("[data-assigment-number-picker-grid]");
    grid.innerHTML = "";
    for (let i = 1; i <= maxNumber; i++) {
      const btn = document.createElement("button");
      btn.className = "number-btn";
      btn.dataset.assignmentNumber = i;
      btn.textContent = i;
      grid.appendChild(btn);
    }
  }
  return { createModal, initializeNumbers };
};

const createTracker = (notSubmittableNumbers) => {
  const assignments = new Map();
  const subscribers = [];

  function getAssignments() {
    return assignments;
  }

  function getAssignment(fileId) {
    return assignments.get(fileId);
  }

  function assignNumber(fileId, number) {
    assignments.set(fileId, number);
    notify({ actionType: "assign", fileId, number });
  }

  function unassignNumber(fileId) {
    const assignment = assignments.get(fileId);
    if (assignment) {
      assignments.delete(fileId);
      notify({ actionType: "unassign", fileId });
    }
  }

  function isNumberUsed(number) {
    if (notSubmittableNumbers && notSubmittableNumbers.includes(number)) {
      return true;
    }
    for (const [_, assignment] of assignments) {
      if (assignment === number) {
        return true;
      }
    }
    return false;
  }

  function getNumberReason(number) {
    if (notSubmittableNumbers.includes(number)) {
      return `Assigment submitted twice and can no longer be submitted`;
    }
    for (const [fileId, assignment] of assignments) {
      if (assignment === number) {
        return `Number already used by file ${fileId}`;
      }
    }
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return () => subscribers.filter((sub) => sub !== fn);
  }

  function notify(data) {
    subscribers.forEach((fn) => fn(data));
  }

  return {
    isNumberUsed,
    getAssignment,
    assignNumber,
    unassignNumber,
    getNumberReason,
    getAssignments,
    subscribe,
    notify
  };
};

const createAssignmentNumberTracker = (type, notSubmittableNumbers) => {
  const trackers = {
    code: createTracker(notSubmittableNumbers),
    video: createTracker(notSubmittableNumbers)
  };

  if (!trackers[type]) {
    throw new Error(`Unsupported type: ${type}`);
  }

  return trackers[type];
};

const createTooltipManager = () => {
  const tooltip = document.createElement("div");
  tooltip.className = "number-tooltip";
  document.body.appendChild(tooltip);
  let hideTimeout;

  let activeFileId = null;
  let currentAssignment = null;
  let modalElement = null;
  let tooltipShown = false;

  function showTooltip(modal, element, reason) {
    if (tooltipShown === true) return;
    if (!reason) return;

    const assignmentNumber = parseInt(element.dataset.assignmentNumber);
    if (assignmentNumber === currentAssignment) return;

    tooltipShown = true;

    if (element) clearTimeout(hideTimeout);

    tooltip.textContent = reason;
    const rect = modal.getBoundingClientRect();
    tooltip.style.top = `${
      rect.top + window.scrollY - tooltip.offsetHeight - 30
    }px`;
    tooltip.style.left = `${rect.left + window.scrollX - 10}px`;
    tooltip.style.display = "block";
  }

  function hideTooltip(delay = 0) {
    hideTimeout = setTimeout(() => {
      tooltip.style.display = "none";
      tooltipShown = false;
    }, delay);
  }

  function setActiveFileInfo(fileId, assignment) {
    activeFileId = fileId;
    currentAssignment = assignment;
  }
  function setModalElement(modal) {
    modalElement = modal;
  }

  function setupTooltipEvents(element) {
    // Mouse events
    element.addEventListener("mouseover", (e) => {
      if (e.target.classList.contains("number-disabled")) {
        showTooltip(modalElement, e.target, e.target.dataset.disabledReason);
      }
    });

    element.addEventListener("mouseout", () => hideTooltip());

    element.addEventListener("touchstart", (e) => {
      if (e.target.classList.contains("number-disabled")) {
        showTooltip(modalElement, e.target, e.target.dataset.disabledReason);
        hideTooltip(2000);
      }
    });
  }

  return { setupTooltipEvents, setActiveFileInfo, setModalElement };
};

const createNumberPicker = (type, maxNumber, notSubmittableNumbers) => {
  const modalFactory = createModalFactory();
  const tooltipManger = createTooltipManager();
  const assignmentTracker = createAssignmentNumberTracker(
    type,
    notSubmittableNumbers
  );

  let activeFileId = null;
  let modalShownState = false;
  const modal = modalFactory.createModal(type);
  modalFactory.initializeNumbers(modal, maxNumber);
  tooltipManger.setupTooltipEvents(modal);
  tooltipManger.setModalElement(modal);

  const fileNumberButtons =
    type === "code" ? codeFileNumberButtons : videoFileNumberButtons;

  function getModalShownState() {
    return modalShownState;
  }

  function getActiveFileId() {
    return activeFileId;
  }

  function updateNumbers() {
    const buttons = modal.querySelectorAll(".number-btn");
    buttons.forEach((btn) => {
      const number = parseInt(btn.dataset.assignmentNumber);
      const isUsed = assignmentTracker.isNumberUsed(number);
      const currentAssignmentNumber =
        assignmentTracker.getAssignment(activeFileId);

      const shouldDisable = isUsed && currentAssignmentNumber !== number;
      if (isUsed) {
        btn.classList.add("number-disabled");
        btn.disabled = shouldDisable;
      } else {
        btn.classList.remove("number-disabled");
      }

      if (isUsed) {
        btn.dataset.disabledReason = assignmentTracker.getNumberReason(
          number,
          type
        );
      } else {
        delete btn.dataset.disabledReason;
      }
    });
  }

  function handleNumberSelection(button) {
    const number = parseInt(button.dataset.assignmentNumber);
    const assignment = assignmentTracker.getAssignment(activeFileId);
    if (assignment && assignment === number) {
      assignmentTracker.unassignNumber(activeFileId);
    } else if (!button.classList.contains("number-disabled")) {
      assignmentTracker.assignNumber(activeFileId, number);
    }
    hideModal();
  }

  function showModal(fileId, buttonRect) {
    activeFileId = fileId;
    const currentAssignment = assignmentTracker.getAssignment(fileId);
    tooltipManger.setActiveFileInfo(fileId, currentAssignment);
    modalShownState = true;
    updateNumbers();
    modal.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
    modal.style.left = `${buttonRect.left + window.scrollX - 2}px`;
    modal.style.display = "block";
  }

  function hideModal() {
    modalShownState = false;
    modal.style.display = "none";
    activeFileId = null;
    tooltipManger.setActiveFileInfo(null, null);
  }

  assignmentTracker.subscribe(({ actionType, fileId, number }) => {
    if (actionType === "assign" || actionType === "unassign") {
      updateNumbers();

      const button = fileNumberButtons.get(fileId);
      if (button) {
        button.textContent = actionType === "assign" ? `${number}` : "#";
      }
    }

    switch (type) {
      case "code":
        const selectedCourseFiles = selectedCodeFilesState.getState();
        if (actionType === "assign") {
          selectedCourseFiles.get(fileId).assignmentNumber = number;
        } else if (actionType === "unassign") {
          selectedCourseFiles.has(fileId)
            ? (selectedCourseFiles.get(fileId).assignmentNumber = null)
            : "";
        }
        selectedCodeFilesState.setState(selectedCourseFiles);
        break;
      case "video":
        const selectedVideoFiles = selectedVideoFilesState.getState();
        if (actionType === "assign") {
          selectedVideoFiles.get(fileId).assignmentNumber = number;
        } else if (actionType === "unassign") {
          selectedVideoFiles.get(fileId).assignmentNumber = null;
        }
        selectedVideoFilesState.setState(selectedVideoFiles);
        break;
    }
  });

  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("number-btn")) {
      handleNumberSelection(e.target);
    }
  });

  document.addEventListener("click", (e) => {
    if (
      modalShownState &&
      !modal.contains(e.target) &&
      !e.target.classList.contains("assignment-number-btn")
    ) {
      hideModal();
    }
  });

  function handleFileDeleteUnassign(fileId) {
    if (activeFileId === fileId && modalShownState) {
      hideModal();
    } else if (modalShownState) {
      const activeButton = fileNumberButtons.get(activeFileId);
      if (activeButton) {
        const buttonRect = activeButton.getBoundingClientRect();
        modal.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
        modal.style.left = `${buttonRect.left + window.scrollX - 2}px`;
      }
    }
    assignmentTracker.unassignNumber(fileId);
  }

  return {
    getActiveFileId,
    getModalShownState,
    handleFileDeleteUnassign,
    hideModal,
    showModal
  };
};

const handleFileSelectionAndUpload = (() => {
  const fileUploadStepContainer = document.querySelector(
    "[data-step-file-upload]"
  );

  const currentUsernameHeader = fileUploadStepContainer.querySelector(
    "[data-upload-student-name]"
  );
  const uploadCodefilesChoiceBtn = fileUploadStepContainer.querySelector(
    "[data-upload-choice-codefiles]"
  );
  const uploadVideofilesChoiceBtn = fileUploadStepContainer.querySelector(
    "[data-upload-choice-videofiles]"
  );
  const codeFilesInput = fileUploadStepContainer.querySelector(
    "[data-codefiles-input]"
  );
  const videoFilesInput = fileUploadStepContainer.querySelector(
    "[data-videofiles-input]"
  );
  const requiredFileInfoMobile = fileUploadStepContainer.querySelector(
    "[data-file-info-mobile]"
  );
  const filePickerBtnMobile = fileUploadStepContainer.querySelector(
    "[data-file-picker-button-mobile]"
  );
  const codeFileDropzone = fileUploadStepContainer.querySelector(
    "[data-codefile-dropzone-container]"
  );
  const codeDropzoneFilePicker = codeFileDropzone.querySelector(
    "[data-dropzone-code-file-picker]"
  );
  const requiredFileInfoCodeDropzone = codeFileDropzone.querySelector(
    "[data-codefile-info-dropzone]"
  );

  const videoFileDropzone = fileUploadStepContainer.querySelector(
    "[data-videofile-dropzone-container]"
  );

  const videoDropzoneFilePicker = videoFileDropzone.querySelector(
    "[data-dropzone-video-file-picker]"
  );
  const requiredFileInfoVideoDropzone = videoFileDropzone.querySelector(
    "[data-codefile-info-dropzone]"
  );

  const codeSectionContainer = fileUploadStepContainer.querySelector(
    "[data-codesection-container]"
  );

  const selectedCodeFilesContainer = codeSectionContainer.querySelector(
    "[data-selected-code-files]"
  );
  const selectedCodeFilesList = selectedCodeFilesContainer.querySelector(
    "[data-selected-code-files-list]"
  );

  const uploadingCodeFilesContainer = codeSectionContainer.querySelector(
    "[data-uploading-code-files]"
  );

  const uploadingCodeFilesList = uploadingCodeFilesContainer.querySelector(
    "[data-uploading-code-files-list]"
  );

  const videoSectionContainer = fileUploadStepContainer.querySelector(
    "[data-videosection-container]"
  );

  const selectedVideoFilesContainer = videoSectionContainer.querySelector(
    "[data-selected-video-files]"
  );
  const selectedVideoFilesList = selectedVideoFilesContainer.querySelector(
    "[data-selected-video-files-list]"
  );
  const uploadingVideoFilesContainer = videoSectionContainer.querySelector(
    "[data-uploading-video-files]"
  );

  const uploadingVideoFilesList = uploadingVideoFilesContainer.querySelector(
    "[data-uploading-video-files-list]"
  );

  const backButton =
    fileUploadStepContainer.querySelector("[data-back-button]");

  const uploadButton =
    fileUploadStepContainer.querySelector("[data-proceed-btn]");

  const resetButton = fileUploadStepContainer.querySelector(
    "[data-reset-button]"
  );

  const spinnerSection = fileUploadStepContainer.querySelector(
    "[data-spinner-section]"
  );

  const viewValidationErrorMessagesBtn = fileUploadStepContainer.querySelector(
    "[data-view-file-validation-errors-btn]"
  );

  const errorMessageSection = fileUploadStepContainer.querySelector(
    "[data-validation-error-section]"
  );

  const assignmentNumberValidationMessage =
    fileUploadStepContainer.querySelector(
      "[data-assignment-number-error-message]"
    );

  const generalValidationMessageContainer =
    fileUploadStepContainer.querySelector(
      "[data-general-validation-error-message]"
    );

  const assignmentErrorMessageDialog = document.querySelector(
    "[ data-assignment-error-dialog-modal]"
  );
  const assignmentErrorMessageModalCloseBtn = document.querySelector(
    "[data-error-message-close-btn]"
  );

  const assigmentErrorList = document.querySelector(
    "[data-assignment-error-list]"
  );

  let validatedCodeFiles = new Set();
  let validatedVideoFiles = new Set();

  let hasAttemptedCodeValidation = false;
  let hasAttemptedVideoValidation = false;

  function updateRequiredFileInfoState(state) {
    requiredFileInfoMobile.textContent = `file must be a ${state} file, max size of 1mb`;
    requiredFileInfoCodeDropzone.textContent = `file must be a ${state} file, max size of 1mb`;
  }

  function computeRequiredFileInfoState(state) {
    const selectedCourse = selectedCourseState.getState();
    if (state == "code") {
      switch (selectedCourse) {
        case "Python":
          updateRequiredFileInfoState(".py");
          break;
        case "Java":
          updateRequiredFileInfoState(".java");
          break;
        case "C":
          updateRequiredFileInfoState(".c");
      }
    }
    if (state == "video") {
      requiredFileInfoMobile.textContent = `file must be a .mp4 file, max size of 100mb`;
      requiredFileInfoCodeDropzone.textContent = `file must be a .mp4 file, max size of 100mb`;
    }
  }

  function switchChoiceToCode() {
    uploadChoiceState.setState("code");
    uploadCodefilesChoiceBtn.classList.add("active");
    uploadVideofilesChoiceBtn.classList.remove("active");
    codeFileDropzone.classList.remove("fade-out");
    codeFileDropzone.classList.add("fade-in");
    videoFileDropzone.classList.remove("fade-in");
    videoFileDropzone.classList.add("fade-out");
    videoFileDropzone.addEventListener(
      "animationend",
      () => {
        codeFileDropzone.classList.add("active");
        videoFileDropzone.classList.remove("active");
      },
      {
        once: true
      }
    );
    uploadCodefilesChoiceBtn.setAttribute("disabled", "true");
    uploadVideofilesChoiceBtn.removeAttribute("disabled");
    videoSectionContainer.classList.remove("active");
    codeSectionContainer.classList.add("active");
  }

  function switchChoiceToVideo() {
    uploadChoiceState.setState("video");
    uploadCodefilesChoiceBtn.classList.remove("active");
    uploadVideofilesChoiceBtn.classList.add("active");
    videoFileDropzone.classList.remove("fade-out");
    codeFileDropzone.classList.add("fade-out");
    codeFileDropzone.classList.remove("fade-in");
    videoFileDropzone.classList.add("fade-in");
    codeFileDropzone.addEventListener(
      "animationend",
      () => {
        videoFileDropzone.classList.add("active");
        codeFileDropzone.classList.remove("active");
      },
      { once: true }
    );
    uploadVideofilesChoiceBtn.setAttribute("disabled", "true");
    uploadCodefilesChoiceBtn.removeAttribute("disabled");
    videoSectionContainer.classList.add("active");
    codeSectionContainer.classList.remove("active");
  }

  function computeCodefilesInputState(state) {
    switch (state) {
      case "Python":
        codeFilesInput.setAttribute("accept", ".py");
        break;
      case "Java":
        codeFilesInput.setAttribute("accept", ".java");
        break;
      case "C":
        codeFilesInput.setAttribute("accept", ".c");
    }
  }

  function updateCodeFileSelectionUi() {
    selectedCodeFilesContainer.classList.add("active");
    codeSectionContainer.classList.add("active");
  }

  function updateVideoFileSelectionUi() {
    selectedVideoFilesContainer.classList.add("active");
    videoSectionContainer.classList.add("active");
  }

  function updateUiOnFileAdded() {
    const fileChoice = uploadChoiceState.getState();
    fileChoice === "code"
      ? updateCodeFileSelectionUi()
      : updateVideoFileSelectionUi();
  }

  // function updateUiOnFileRemoved(){

  // }

  function handleFileSelection(files) {
    const fileChoice = uploadChoiceState.getState();
    if (fileChoice == "code") {
      const selectedCodeFiles = selectedCodeFilesState.getState();
      const maxAssignmentNumber =
        assignmentMetaDataState.getState().maxAssignmentNumber;
      if (selectedCodeFiles.size >= maxAssignmentNumber) {
        showToast("Cannot Select more than max assignment number", "info");
        return;
      }
      for (let file of files) {
        if (selectedCodeFiles.has(file.name)) {
          selectedCodeFiles[file.name] = {
            assignmentFile: file,
            assignmentNumber: null
          };
          updateFileListItem(file.name);
        } else {
          selectedCodeFiles.set(file.name, {
            assignmentFile: file,
            assignmentNumber: null
          });
          addFileToList(file);
        }
        selectedCodeFilesState.setState(selectedCodeFiles);
      }

      codeFilesInput.value = "";
    } else {
      const selectedVideoFiles = selectedVideoFilesState.getState();

      for (let file of files) {
        if (selectedVideoFiles.has(file.name)) {
          selectedVideoFiles[file.name] = {
            assignmentFile: file,
            assignmentNumber: null
          };
          updateFileListItem(file.name);
        } else {
          selectedVideoFiles.set(file.name, {
            assignmentFile: file,
            assignmentNumber: null
          });
          addFileToList(file);
        }
        selectedVideoFilesState.setState(selectedVideoFiles);
      }
      videoFilesInput.value = "";
    }
    updateUiOnFileAdded();
  }

  function createFilelistItem(file) {
    const fileChoice = uploadChoiceState.getState();
    const codeFileSvg = `<svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1"
            stroke="currentColor"
            class="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
            />
          </svg>`;
    const videoFileSvg = `<svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="size-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
      />
    </svg>`;
    const li = document.createElement("li");
    li.classList.add("selected-file-list-item");
    li.setAttribute("data-selected-files-list-item", true);
    li.dataset.fileName = file.name;
    li.innerHTML = `
        <div class="selected-file-list-item-svg">
         ${fileChoice === "code" ? codeFileSvg : videoFileSvg}
        </div>
        <div class="selected-file-list-item-details">
          <div class="selected-file-list-name-section">
          <p
            data-selected-file-list-item-name
            class="selected-file-list-item-name"
          >
            ${file.name}
          </p>
          </div>
          <div class="selected-file-list-buttons-section">
            <button
              type="button"
              class="selected-file-list-button select-assignment-number-button"
              data-select-assignment-number-button
            >#</button>
            <button
              type="button"
              class="delete-selected-file-button selected-file-list-button"
              data-delete-selected-file-button
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="3"
                stroke="currentColor"
                class="size-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 12h14"
                />
              </svg>
            </button>
          </div>
        </div>`;

    const deleteFileButton = li.querySelector(
      "[data-delete-selected-file-button]"
    );
    deleteFileButton.addEventListener("click", () => {
      removeSelectedFile(file.name);
    });

    const selectAssignmentNumberButton = li.querySelector(
      "[data-select-assignment-number-button]"
    );
    selectAssignmentNumberButton.addEventListener("click", (e) => {
      e.stopPropagation();
      switch (fileChoice) {
        case "code":
          if (codeAssignmentNumberPicker.getActiveFileId() === file.name) {
            codeAssignmentNumberPicker.hideModal();
          } else {
            codeAssignmentNumberPicker.showModal(
              file.name,
              selectAssignmentNumberButton.getBoundingClientRect()
            );
          }
          break;
        case "video":
          if (videoAssignmentNumberPicker.getActiveFileId() === file.name) {
            videoAssignmentNumberPicker.hideModal();
          } else {
            videoAssignmentNumberPicker.showModal(
              file.name,
              selectAssignmentNumberButton.getBoundingClientRect()
            );
          }
          break;
      }
    });
    const fileNumberButtons =
      fileChoice === "code" ? codeFileNumberButtons : videoFileNumberButtons;
    fileNumberButtons.set(file.name, selectAssignmentNumberButton);
    return li;
  }

  function addFileToList(file) {
    const fileChoice = uploadChoiceState.getState();
    const li = createFilelistItem(file);
    fileChoice === "code"
      ? selectedCodeFilesList.appendChild(li)
      : selectedVideoFilesList.appendChild(li);
  }

  function updateFileListItem(fileName) {
    const fileChoice = uploadChoiceState.getState();
    let listItems = null;
    fileChoice === "code"
      ? (listItems = selectedCodeFilesList.querySelectorAll(
          "[data-selected-files-list-item]"
        ))
      : (listItems = selectedVideoFilesList.querySelectorAll(
          "[data-selected-files-list-item]"
        ));

    listItems.forEach((item) => {
      const fileNameElement = item.querySelector(
        "[data-selected-file-list-item-name]"
      );

      if (fileNameElement.textContent === fileName) {
        fileNameElement.textContent = fileName;
      }
    });
  }
  function removeSelectedFile(fileName) {
    const fileChoice = uploadChoiceState.getState();
    const selectedCodeFiles = selectedCodeFilesState.getState();
    const selectedVideoFiles = selectedVideoFilesState.getState();
    const codeValidationErrors = codeFileValidationErrorState.getState();
    const videoValidationErrors = videoFileValidationErrorState.getState();
    if (fileChoice === "code") {
      if (hasAttemptedCodeValidation) {
        validatedCodeFiles.delete(fileName);
      }
      const listItem = Array.from(selectedCodeFilesList.children).filter(
        (item) => item.dataset.fileName === fileName
      );
      selectedCodeFilesList.removeChild(listItem[0]);
      selectedCodeFiles.delete(fileName);
      selectedCodeFilesState.setState(selectedCodeFiles);
      codeAssignmentNumberPicker.handleFileDeleteUnassign(fileName);
      if (codeValidationErrors.has(fileName)) {
        codeValidationErrors.delete(fileName);
        codeFileValidationErrorState.setState(codeValidationErrors);
      }
    } else {
      const listItem = Array.from(selectedVideoFilesList.children).filter(
        (item) => item.dataset.fileName === fileName
      );
      selectedVideoFilesList.removeChild(listItem[0]);
      selectedVideoFiles.delete(fileName);
      selectedVideoFilesState.setState(selectedVideoFiles);
      videoAssignmentNumberPicker.handleFileDeleteUnassign(fileName);

      if (hasAttemptedVideoValidation) {
        validatedVideoFiles.delete(fileName);
      }

      if (videoValidationErrors.has(fileName)) {
        videoValidationErrors.delete(fileName);
        videoFileValidationErrorState.setState(videoValidationErrors);
      }
    }
    if (hasAttemptedCodeValidation || hasAttemptedVideoValidation) {
      updateErrorValidationUIStates(false);
    }
  }

  function getFileExtension(filename) {
    return filename.split(".").pop();
  }

  function validateFileType(file, type) {
    var fileExtension = getFileExtension(file.name);
    if (type === "code") {
      const selectedCourse = selectedCourseState.getState();
      switch (selectedCourse) {
        case "Python":
          if (
            fileExtension !== ("py" || "PY") &&
            (file.type !== "text/x-python" || file.type !== "text/plain")
          ) {
            return "file must be a text file with a .py extension";
          } else {
            return false;
          }

        case "Java":
          if (
            fileExtension !== ("java" || "JAVA") &&
            (file.type !== "text/x-java" || file.type !== "text/plain")
          ) {
            return "file must be a text file with a .java extension";
          } else {
            return false;
          }
        case "C":
          if (
            fileExtension !== ("c" || "C") &&
            (file.type !== "text/x-c" || file.type !== "text/plain")
          ) {
            return "file must be a text file with a .c extension";
          } else {
            return false;
          }
      }
    } else if (type == "video") {
      if (fileExtension !== ("mp4" || "MP4") && file.type !== "video/mp4") {
        return "file must be a video file with a .mp4 extension";
      } else {
        return false;
      }
    }
  }

  function validateFileSize(size, type) {
    switch (type) {
      case "code":
        if (size <= 0) {
          return `code file size cannot be less than or equals ${formatFileSize(
            size
          )}`;
        } else if (size > maxCodeFileSize) {
          return `code file size cannot be greater than ${formatFileSize(
            maxCodeFileSize
          )}`;
        } else {
          return false;
        }
      case "video":
        if (size <= 0) {
          return `video file size cannot be less than or equals ${formatFileSize(
            size
          )}`;
        } else if (size > maxVideoFileSize) {
          return `video file size cannot be greater than ${formatFileSize(
            maxVideoFileSize
          )}`;
        } else {
          return false;
        }
    }
  }

  function addError(fileName, errors, type) {
    if (type === "code") {
      const codeFileValidationErrors = codeFileValidationErrorState.getState();
      if (errors.length > 0) {
        codeFileValidationErrors.set(fileName, errors);
        codeFileValidationErrorState.setState(codeFileValidationErrors);
      } else {
        codeFileValidationErrorState.setState(new Map());
      }
    } else if (type === "video") {
      const videoFileValidationErrors =
        videoFileValidationErrorState.getState();
      if (errors.length > 0) {
        videoFileValidationErrors.set(fileName, errors);
        videoFileValidationErrorState.setState(videoFileValidationErrors);
      } else {
        videoFileValidationErrorState.setState(new Map());
      }
    }
  }

  function validateSelectedCodeFiles() {
    const selectedCodeFiles = selectedCodeFilesState.getState();
    for (const [fileName, fileObject] of selectedCodeFiles) {
      let errors = [];
      if (fileObject["assignmentNumber"] == null) {
        errors.push("Please select assignment number for file");
      }
      const fileTypeResult = validateFileType(
        fileObject["assignmentFile"],
        "code"
      );
      if (fileTypeResult !== false) {
        errors.push(fileTypeResult);
      }
      const fileSizeResult = validateFileSize(
        fileObject["assignmentFile"].size,
        "code"
      );
      if (fileSizeResult !== false) {
        errors.push(fileSizeResult);
      }
      addError(fileName, errors, "code");
      validatedCodeFiles.add(fileName);
    }
  }

  function validateSelectedVideoFiles() {
    const selectedVideoFiles = selectedVideoFilesState.getState();
    for (const [fileName, fileObject] of selectedVideoFiles) {
      let errors = [];
      if (fileObject["assignmentNumber"] == null) {
        errors.push("Please select assignment number for file");
      }
      const fileTypeResult = validateFileType(
        fileObject["assignmentFile"],
        "video"
      );
      if (fileTypeResult !== false) {
        errors.push(fileTypeResult);
      }

      const fileSizeResult = validateFileSize(
        fileObject["assignmentFile"].size,
        "video"
      );

      if (fileSizeResult !== false) {
        errors.push(fileSizeResult);
      }
      if (errors.length > 0) {
        addError(fileName, errors, "video");
        validatedVideoFiles.add(fileName);
      }
    }
  }

  function getOnlyNumberValidationState() {
    const uploadChoice = uploadChoiceState.getState();

    if (uploadChoice === "code") {
      const codeValidationErrors = codeFileValidationErrorState.getState();
      const onlyNumberErrorCount = [...codeValidationErrors].filter(
        ([_, errors]) =>
          errors?.length === 1 &&
          errors[0] === "Please select assignment number for file"
      ).length;

      return (
        codeValidationErrors.size > 0 &&
        onlyNumberErrorCount === codeValidationErrors.size
      );
    }

    if (uploadChoice === "video") {
      const videoValidationErrors = videoFileValidationErrorState.getState();
      const onlyNumberErrorCount = [...videoValidationErrors].filter(
        ([_, errors]) =>
          errors?.length === 1 &&
          errors[0] === "Please select assignment number for file"
      ).length;

      return (
        videoValidationErrors.size > 0 &&
        onlyNumberErrorCount === videoValidationErrors.size
      );
    }

    return false;
  }

  function updateNumberValidationErrorUI() {
    const onlyNumberState = getOnlyNumberValidationState();
    assignmentNumberValidationMessage.classList.toggle(
      "active",
      onlyNumberState
    );
  }

  function updateCodeValidationErrorUIState(toast) {
    const onlyNumberState = getOnlyNumberValidationState();
    const codeValidationErrors = codeFileValidationErrorState.getState();
    if (onlyNumberState) {
      assignmentNumberValidationMessage.classList.add("active");
      generalValidationMessageContainer.classList.remove("active");
      toast
        ? showToast("please select assignment number for files", "error")
        : "";
    } else if (!onlyNumberState && codeValidationErrors.size > 0) {
      assignmentNumberValidationMessage.classList.remove("active");
      generalValidationMessageContainer.classList.add("active");
      toast ? showToast("Some files failed validation", "error") : "";
    } else {
      generalValidationMessageContainer.classList.remove("active");
      assignmentNumberValidationMessage.classList.remove("active");
    }
  }

  function updateVideoValidationErrorUIState(toast) {
    const onlyNumberState = getOnlyNumberValidationState();
    const videoValidationErrors = videoFileValidationErrorState.getState();

    if (onlyNumberState) {
      assignmentNumberValidationMessage.classList.add("active");
      generalValidationMessageContainer.classList.remove("active");
      toast
        ? showToast("please select assignment number for files", "error")
        : "";
    } else if (!onlyNumberState && videoValidationErrors.size > 0) {
      assignmentNumberValidationMessage.classList.remove("active");
      generalValidationMessageContainer.classList.add("active");
      toast ? showToast("Some files failed validation", "error") : "";
    } else {
      generalValidationMessageContainer.classList.remove("active");
      assignmentNumberValidationMessage.classList.remove("active");
    }
  }

  function updateErrorValidationUIStates(toast) {
    errorMessageSection.classList.add("active");
    const uploadChoice = uploadChoiceState.getState();
    if (uploadChoice === "code") {
      updateCodeValidationErrorUIState(toast);
    } else if (uploadChoice === "video") {
      updateVideoValidationErrorUIState(toast);
    }
  }

  function resetValidationUIStates() {
    generalValidationMessageContainer.classList.remove("active");
    assignmentNumberValidationMessage.classList.remove("active");
  }

  function resetAttemptedValidationStates() {
    hasAttemptedCodeValidation = false;
    hasAttemptedVideoValidation = false;
  }

  function resetValidatedFilesSets() {
    validatedCodeFiles = new Set();
    validatedVideoFiles = new Set();
  }

  function populateNumberValidationError(fileName, fileType) {
    if (fileType === "code" && !hasAttemptedCodeValidation) return;
    if (fileType === "video" && !hasAttemptedVideoValidation) return;

    const errorState =
      fileType === "code"
        ? codeFileValidationErrorState
        : videoFileValidationErrorState;

    const errors = errorState.getState();

    if (errors.has(fileName)) {
      const errorList = errors.get(fileName);
      if (!errorList.includes("Please select assignment number for file")) {
        errorList.push("Please select assignment number for file");
        errors.set(fileName, errorList);
      }
    } else {
      errors.set(fileName, ["Please select assignment number for file"]);
    }

    errorState.setState(errors);

    updateNumberValidationErrorUI();
  }

  function clearNumberValidationError(fileName, fileType) {
    if (fileType === "code" && !hasAttemptedCodeValidation) return;
    if (fileType === "video" && !hasAttemptedVideoValidation) return;

    const errorState =
      fileType === "code"
        ? codeFileValidationErrorState
        : videoFileValidationErrorState;

    const errors = errorState.getState();
    if (!errors.has(fileName)) return;
    const updatedErrors = errors
      .get(fileName)
      .filter(
        (error) => !error.includes("Please select assignment number for file")
      );

    if (updatedErrors.length === 0) {
      errors.delete(fileName);
    } else {
      errors.set(fileName, updatedErrors);
    }

    errorState.setState(errors);

    updateNumberValidationErrorUI();
  }

  function clearCodeValidationErrors() {
    const errorMap = codeFileValidationErrorState.getState();
    Array.from(selectedCodeFilesList.children).forEach((listFile) => {
      const fileName = listFile.dataset.fileName;
      const listButton = listFile.querySelector(
        "[data-select-assignment-number-button]"
      );
      const fileErrors = errorMap.get(fileName) || [];
      const hasSpecificError =
        fileErrors.length === 1 &&
        fileErrors[0] === "Please select assignment number for file";

      listButton.classList.toggle("error", hasSpecificError);
      listFile.classList.toggle(
        "error",
        !hasSpecificError && fileErrors.length > 0
      );
    });
  }

  function clearVideoValidationErrors() {
    const errorMap = videoFileValidationErrorState.getState();
    Array.from(selectedVideoFilesList.children).forEach((listFile) => {
      const fileName = listFile.dataset.fileName;
      const listButton = listFile.querySelector(
        "[data-select-assignment-number-button]"
      );
      const fileErrors = errorMap.get(fileName) || [];
      const hasSpecificError =
        fileErrors.length === 1 &&
        fileErrors[0] === "Please select assignment number for file";

      listButton.classList.toggle("error", hasSpecificError);
      listFile.classList.toggle(
        "error",
        !hasSpecificError && fileErrors.length > 0
      );
    });
  }

  function createErrorListItem() {
    const li = document.createElement("li");
    li.classList.add("error-message-list-item");
    return li;
  }

  function createErrorFilenameHeader() {
    const h4 = document.createElement("h4");
    h4.classList.add("error-message-filename");
    return h4;
  }
  function createErrorParagraphElement() {
    const p = document.createElement("p");
    p.classList.add("error-message-paragraph");
    return p;
  }

  function generateValidationErrorMessageList() {
    const fileChoice = uploadChoiceState.getState();

    const errors =
      fileChoice === "code"
        ? codeFileValidationErrorState.getState()
        : videoFileValidationErrorState.getState();

    for (const [filename, errorList] of errors) {
      const listItem = createErrorListItem();
      const filenameHeader = createErrorFilenameHeader();
      filenameHeader.textContent = filename;
      listItem.appendChild(filenameHeader);
      errorList.forEach((error) => {
        const errorMessageParagraph = createErrorParagraphElement();
        errorMessageParagraph.textContent = error;
        listItem.appendChild(errorMessageParagraph);
      });
      assigmentErrorList.appendChild(listItem);
    }
  }

  //actual upload logic

  const codeFilesUploadQueueState = createStateManager([]);
  const videoFilesUploadQueueState = createStateManager([]);

  const currentCodeFileUploadReqState = createStateManager(null);
  const currentVideoFileUploadReqState = createStateManager(null);

  const isCodeFileUploadingState = createStateManager(false);
  const isVideoFileUploadingState = createStateManager(false);

  const currentUploadedCodeFilesState = createStateManager([]);
  const currentUploadedVideoFilesState = createStateManager([]);

  const currentUploadingCodeFileState = createStateManager({});
  const currentUploadingVideoFileState = createStateManager({});

  const isFileUploadingState = createStateManager(
    isCodeFileUploadingState.getState() || isVideoFileUploadingState.getState()
  );

  function disableFileUploadStepButtons() {
    backButton.setAttribute("disabled", "true");
    resetButton.setAttribute("disabled", "true");
    uploadButton.setAttribute("disabled", "true");
  }

  function enableFileUploadStepButtons() {
    backButton.removeAttribute("disabled");
    resetButton.removeAttribute("disabled");
    uploadButton.removeAttribute("disabled");
  }

  function replaceUploadCancelButtonWithCheckmark(fileName) {
    const cancelBtn = fileUploadStepContainer
      .querySelector(`[data-uploading-filename="${fileName}"]`)
      ?.querySelector("[data-cancel-uploading-file-button]");

    const checkmark = fileUploadStepContainer
      .querySelector(`[data-uploading-filename="${fileName}"]`)
      ?.querySelector("[data-file-uploaded-checkmark]");

    if (checkmark && cancelBtn) {
      checkmark.classList.add("uploaded");
      cancelBtn.classList.add("uploaded");
      cancelBtn.setAttribute("disabled", true);
    }
  }

  function populateFloatingUpload(progress) {
    const fileChoice = uploadChoiceState.getState();
    if (fileChoice === "code") {
    }
  }

  function updateUIonUploadStart() {
    const choice = uploadChoiceState.getState();
    if (choice === "code") {
      selectedCodeFilesContainer.classList.remove("active");
      uploadingCodeFilesContainer.classList.add("active");
      selectedCodeFilesList.classList.remove("active");
      uploadingCodeFilesList.classList.add("active");
    } else if (choice === "video") {
      selectedVideoFilesContainer.classList.remove("active");
      uploadingVideoFilesContainer.classList.add("active");
      uploadingVideoFilesList.classList.add("active");
      selectedVideoFilesList.classList.remove("active");
    }
    disableFileUploadStepButtons();
  }

  const uploadErrorQueue = new Set();

  function markFileAsFailed(fileName) {
    const item = document.querySelector(
      `[data-uploading-filename="${fileName}"]`
    );
    if (!item) return;

    const progressText = item.querySelector(
      "[data-uploading-file-progress-text]"
    );
    const waitingText = item.querySelector(
      "[data-uploading-file-waiting-text]"
    );
    const progressBar = item.querySelector("[data-file-uploading-progress]");

    if (progressText) {
      progressText.textContent = "upload failed";
      progressText.style.color = "red";
    }

    if (waitingText) {
      waitingText.classList.remove("active");
    }

    if (progressBar) {
      progressBar.style.display = "none";
    }

    uploadErrorQueue.add(fileName);
  }

  function updateUiOnUploadComplete() {
    handleFileSelectionAndUpload.setIsUploadingState(false);
    enableFileUploadStepButtons();

    if (uploadErrorQueue.size > 0) {
      showToast("Some files failed to upload. Please retry them.", "info");
      uploadErrorQueue.clear();
    } else {
      showToast("Files uploaded Sucessfully", "success");
      handleResetForm.resetFormFileSelectionState();
      const courseState = selectedCourseState.getState();
      console.log(courseState);
      handleFileSelectionAndUpload.resetFileSelectionHandler();
      selectedCourseState.setState(courseState);
      console.log(selectedCourseState.getState());
    }
  }

  function abortUploadReq(choice) {
    const currentReqState =
      choice === "code"
        ? currentCodeFileUploadReqState
        : currentVideoFileUploadReqState;
    currentReqState.getState().abort();
  }

  function cancelUpload(fileName, li) {
    console.log("got here");
    const choice = uploadChoiceState.getState();

    const fileUploadQueueState =
      choice === "code"
        ? codeFilesUploadQueueState
        : videoFilesUploadQueueState;
    const fileUploadQueue =
      choice === "code"
        ? codeFilesUploadQueueState.getState()
        : videoFilesUploadQueueState.getState();

    console.log(fileUploadQueue);

    const index = fileUploadQueue.findIndex(
      (file) => file.assignmentFile.name === fileName
    );

    if (index != -1) {
      fileUploadQueue.splice(index, 1);
      li.remove();
      fileUploadQueueState.setState(fileUploadQueue);
      abortUploadReq(choice);
    } else {
      const item = document.querySelector(
        `[data-uploading-filename="${fileName}"]`
      );
      item.remove();
    }
  }

  function createUploadListItem(fileMap) {
    const fileChoice = uploadChoiceState.getState();
    const file = fileMap.assignmentFile;
    const number = fileMap.assignmentNumber;
    const codeFileSvg = `<svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1"
            stroke="currentColor"
            class="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
            />
          </svg>`;
    const videoFileSvg = `<svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="size-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0 1 18 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 0 1 6 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
      />
    </svg>`;
    const li = document.createElement("li");
    li.classList.add("uploading-file-list-item");
    li.setAttribute("data-uploading-file-list-item", true);
    li.dataset.uploadingFilename = file.name;
    li.innerHTML = `
        <div class="uploading-file-list-item-svg">
          ${fileChoice === "code" ? codeFileSvg : videoFileSvg}
        </div>
       <div class="uploading-file-list-item-details">
        <div class="uploading-file-list-status-section">
          <p
            data-uploading-file-list-item-name
            class="uploading-file-list-item-name"
          >
            ${file.name}
          </p>
          <div
            data-uploading-file-progress-container
            class="uploading-file-progress-container"
          >
            <progress
              data-file-uploading-progress
              class="uploading-file-progress-bar"
              low="10"
              high="90"
              max="100"
              value="0"
            ></progress>
            <span
              class="uploading-file-progress-text"
              data-uploading-file-progress-text
              ><span data-uploading-file-progress-percent>0</span>% of ${formatFileSize(
                file.size
              )}</span
            >
            <span
              data-uploading-file-waiting-text
              class="uploading-file-waiting-text active"
            >
              wating to upload
            </span>
          </div>
        </div>
        <div class="uploading-file-list-buttons-section">
          <button
            type="button"
            class="cancel-uploading-file-button uploading-file-list-button"
            data-cancel-uploading-file-button
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </button>
          <span data-file-uploaded-checkmark class="file-uploaded-checkmark">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="green"
              class="size-2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </span>
        </div>
      </div>
`;

    const cancelBtn = li.querySelector("[data-cancel-uploading-file-button]");
    cancelBtn.addEventListener("click", () => {
      cancelUpload(file.name, li);
    });

    return li;
  }

  function updateUploadProgress(progress, file) {
    const filesUploadingList =
      uploadChoiceState.getState() === "code"
        ? uploadingCodeFilesList
        : uploadingVideoFilesList;

    const fileName = file.assignmentFile.name;
    const uploadingFileList = filesUploadingList.querySelector(
      `[data-uploading-filename="${fileName}"]`
    );
    const progressBar = uploadingFileList.querySelector(
      `[data-file-uploading-progress]`
    );

    const progressText = uploadingFileList.querySelector(
      `[data-uploading-file-progress-text]`
    );

    if (progressText) {
      progressText.classList.add("active");
    }

    if (progressBar) {
      progressBar.classList.add("active");
      progressBar.value = progress;
    }
    const waitingText = uploadingFileList.querySelector(
      `[data-uploading-file-waiting-text]`
    );

    if (waitingText) {
      waitingText.classList.remove("active");
    }

    const progressPercentSpan = uploadingFileList.querySelector(
      `[data-uploading-file-progress-percent]`
    );

    if (progressPercentSpan) {
      progressPercentSpan.textContent = `${Math.trunc(progress)}`;
    }
  }

  function addUploadFileToList(fileMap) {
    const fileChoice = uploadChoiceState.getState();
    const li = createUploadListItem(fileMap);
    fileChoice === "code"
      ? uploadingCodeFilesList.appendChild(li)
      : uploadingVideoFilesList.appendChild(li);
  }

  function computeSubmssionFileType(course, choice) {
    if (choice === "video") {
      return "mp4";
    } else if (choice === "code") {
      switch (course) {
        case "C":
          return "c";
        case "Java":
          return "java";
        case "Python":
          return "py";
      }
    }
  }

  function computeFileSumbmissionRequestData(fileMap) {
    const student = userState.getState();
    const assigmentType = selectedCourseState.getState();
    let uploadChoice = uploadChoiceState.getState();
    let requestData = {};
    requestData["StudentId"] = student.studentId;
    requestData["AssignmentNumber"] = fileMap.assignmentNumber;
    requestData["SubmissionFileType"] = uploadChoice;
    requestData["AssignmentType"] = assigmentType;
    requestData["FileType"] = computeSubmssionFileType(
      assigmentType,
      uploadChoice
    );
    requestData["File"] = fileMap.assignmentFile;

    return requestData;
  }

  function uploadFile(fileMap, choice) {
    const currentReqState =
      choice === "code"
        ? currentCodeFileUploadReqState
        : currentVideoFileUploadReqState;
    return new Promise((resolve, reject) => {
      const req = new XMLHttpRequest();
      currentReqState.setState(req);
      const requestData = computeFileSumbmissionRequestData(fileMap);
      req.open("POST", `${API_BASE_URL}/student/upload`, true);
      const formData = new FormData();
      for (const key in requestData) {
        formData.append(key, requestData[key]);
      }

      console.log(requestData.File);

      req.onload = function () {
        if (this.status !== 200) {
          reject(new Error(this.responseText));
        }
        resolve(this.responseText);
      };

      req.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          if (fileMap) {
            updateUploadProgress(progress, fileMap);
          }
        }
      };

      req.onabort = function () {
        reject(new Error("Upload aborted"));
      };

      req.onerror = function () {
        reject(new Error("Upload failed"));
      };

      // req.setRequestHeader("RequestVerificationToken", antiForgeryToken);

      req.send(formData);
    });
  }

  // function computeUploadQueueBaseCase() {
  //   const choice = uploadChoiceState.getState();
  //   if (choice === "code") {
  //     return (
  //       isCodeFileUploadingState.getState() ||
  //       !codeFilesUploadQueueState.getState().length
  //     );
  //   } else if (choice === "video") {
  //     return (
  //       isVideoFileUploadingState.getState() ||
  //       !videoFilesUploadQueueState.getState().length
  //     );
  //   }
  // }

  function setIsUploadingState(state) {
    uploadChoiceState.getState() === "code"
      ? isCodeFileUploadingState.setState(state)
      : isVideoFileUploadingState.setState(state);
    isFileUploadingState.setState(state);
  }

  // function getFileMapToUpload(index) {
  //   uploadChoiceState.getState() === "code"
  //     ? codeFilesUploadQueueState.getState()[index]
  //     : videoFilesUploadQueueState.getState()[index];
  // }

  // function removedProccesedQueueFile() {
  //   uploadChoiceState.getState() === "code"
  //     ? codeFilesUploadQueueState.getState().shift()
  //     : videoFilesUploadQueueState.getState().shift();
  // }

  async function processUploadQueue(queue) {
    console.log(queue);
    if (!queue.length || isFileUploadingState.getState()) return;
    console.log(queue);
    setIsUploadingState(true);
    const fileMap = queue[0];
    try {
      const result = await uploadFile(fileMap);
      console.log(result);
      replaceUploadCancelButtonWithCheckmark(fileMap.assignmentFile.name);
      queue.shift();
      const metaDataRequestData = computeAssignmentMetaDataRequestData(
        selectedCourseState.getState()
      );
      fetchAndUpdateAssignmentMetaDataState(metaDataRequestData);
    } catch (error) {
      console.log(`Upload queue error: ${error.message}`);
      showToast("an error occured for file", "error");
      queue.shift();
      markFileAsFailed(fileMap.assignmentFile.name);
    } finally {
      setIsUploadingState(false);
    }
    if (queue.length > 0) {
      requestAnimationFrame(() => processUploadQueue(queue));
    } else {
      console.log("All uploads completed.");
      updateUiOnUploadComplete();
    }
  }

  function computeFiles(filesMap) {
    const files = filesMap.values();

    for (let fileMap of files) {
      addUploadFileToList(fileMap);
    }
  }

  function uploadFiles(filesMap, choice) {
    const files = filesMap.values();
    const uploadQueueState =
      choice === "code"
        ? codeFilesUploadQueueState
        : videoFilesUploadQueueState;
    const uploadQueue =
      choice === "code"
        ? codeFilesUploadQueueState.getState()
        : videoFilesUploadQueueState.getState();
    uploadQueue.push(...files);
    uploadQueueState.setState(uploadQueue);
    processUploadQueue(uploadQueue);
  }

  function handleFileUploadProceed() {
    const fileChoice = uploadChoiceState.getState();
    if (fileChoice === "code") {
      validateSelectedCodeFiles();
      hasAttemptedCodeValidation = true;
      const state = codeFileValidationErrorState.getState().size === 0;
      if (state) {
        const fileMaps = selectedCodeFilesState.getState();
        computeFiles(fileMaps);
        updateUIonUploadStart();
        uploadFiles(fileMaps, fileChoice);
      }
    } else if (fileChoice === "video") {
      validateSelectedVideoFiles();
      hasAttemptedVideoValidation = true;
      const state = videoFileValidationErrorState.getState().size === 0;
      if (state) {
        const fileMaps = selectedVideoFilesState.getState();
        computeFiles(fileMaps);
        updateUIonUploadStart();
        uploadFiles(fileMaps, fileChoice);
      }
    }
    updateErrorValidationUIStates(true);
  }

  // initializier and  and subscribers

  function initializeDefaults() {
    const selectedCourse = selectedCourseState.getState();
    const uploadChoice = uploadChoiceState.getState();
    computeCodefilesInputState(selectedCourse);
    computeRequiredFileInfoState(uploadChoice);
  }

  function initializeSubscribers() {
    const requiredFileInfoUnsubscribe = uploadChoiceState.subscribe(
      computeRequiredFileInfoState
    );

    selectedCodeFilesState.subscribe((state) => {
      const fileChoice = uploadChoiceState.getState();
      if (fileChoice == "code") {
        if (state.size > 0) {
          uploadButton.style.display = "flex";
        } else {
          uploadButton.style.display = "none";
        }
      }

      if (hasAttemptedCodeValidation) {
        for (const [fileName, fileObject] of state) {
          if (validatedCodeFiles.has(fileName)) {
            if (fileObject.assignmentNumber != null) {
              clearNumberValidationError(fileName, "code");
            } else {
              populateNumberValidationError(fileName, "code");
            }
          }
        }
      }
    });

    selectedVideoFilesState.subscribe((state) => {
      const fileChoice = uploadChoiceState.getState();
      if (fileChoice == "video") {
        if (state.size > 0) {
          uploadButton.style.display = "flex";
        } else {
          uploadButton.style.display = "none";
        }
      }

      if (hasAttemptedVideoValidation) {
        for (const [fileName, fileObject] of state) {
          if (validatedVideoFiles.has(fileName)) {
            if (fileObject.assignmentNumber != null) {
              clearNumberValidationError(fileName, "video");
            } else {
              populateNumberValidationError(fileName, "video");
            }
          }
        }
      }
    });

    uploadChoiceState.subscribe((state) => {
      if (state == "code") {
        const selectedCodeFiles = selectedCodeFilesState.getState();
        if (selectedCodeFiles.size > 0) {
          uploadButton.style.display = "flex";
        } else {
          uploadButton.style.display = "none";
        }
        if (!hasAttemptedCodeValidation && !hasAttemptedVideoValidation) return;
        const codeFilesErrors = codeFileValidationErrorState.getState();
        if (codeFilesErrors.size > 0) {
          errorMessageSection.classList.add("active");
        } else {
          errorMessageSection.classList.remove("active");
        }
      } else if (state == "video") {
        const selectedVideoFiles = selectedVideoFilesState.getState();
        if (selectedVideoFiles.size > 0) {
          uploadButton.style.display = "flex";
        } else {
          uploadButton.style.display = "none";
        }
        if (!hasAttemptedVideoValidation && !hasAttemptedCodeValidation) return;
        const videoFilesErrors = videoFileValidationErrorState.getState();
        if (videoFilesErrors.size > 0) {
          errorMessageSection.classList.add("active");
        } else {
          errorMessageSection.classList.remove("active");
        }
      }
    });

    const codeFileInputUnsubscribe = selectedCourseState.subscribe((state) => {
      computeCodefilesInputState(state);
      computeRequiredFileInfoState(uploadChoiceState.getState());
    });

    const currentUserDataUnsubscribe = userState.subscribe((state) => {
      currentUsernameHeader.textContent = `Welcome ${state.firstname}`;
    });

    codeFileValidationErrorState.subscribe((errorMap) => {
      Array.from(selectedCodeFilesList.children).forEach((listFile) => {
        const fileName = listFile.dataset.fileName;
        const listButton = listFile.querySelector(
          "[data-select-assignment-number-button]"
        );
        const fileErrors = errorMap.get(fileName) || [];
        const hasSpecificError =
          fileErrors.length === 1 &&
          fileErrors[0] === "Please select assignment number for file";

        listButton.classList.toggle("error", hasSpecificError);
        listFile.classList.toggle(
          "error",
          !hasSpecificError && fileErrors.length > 0
        );
      });
    });

    videoFileValidationErrorState.subscribe((errorMap) => {
      Array.from(selectedVideoFilesList.children).forEach((listFile) => {
        const fileName = listFile.dataset.fileName;
        const listButton = listFile.querySelector(
          "[data-select-assignment-number-button]"
        );
        const fileErrors = errorMap.get(fileName) || [];
        const hasSpecificError =
          fileErrors.length === 1 &&
          fileErrors[0] === "Please select assignment number for file";

        listButton.classList.toggle("error", hasSpecificError);
        listFile.classList.toggle(
          "error",
          !hasSpecificError && fileErrors.length > 0
        );
      });
    });
  }

  function initializeEventListiners() {
    backButton.addEventListener("click", () => {
      const currentStudentDepartment = getCurrentUserDepartment();

      if (currentStudentDepartment === "Electrical") {
        computeFormToShow(fileUploadStepContainer, "choose-course", "prev");
      } else {
        computeFormToShow(fileUploadStepContainer, "first", "prev");
      }
      handleResetForm.resetFormFileSelectionState();
      resetAttemptedValidationStates();
      resetValidatedFilesSets();
      resetValidationUIStates();
    });

    uploadButton.addEventListener("click", () => {
      handleFileUploadProceed();
    });

    uploadCodefilesChoiceBtn.addEventListener("click", () => {
      switchChoiceToCode();
    });
    uploadVideofilesChoiceBtn.addEventListener("click", () => {
      switchChoiceToVideo();
    });

    filePickerBtnMobile.addEventListener("click", () => {
      let uploadChoice = uploadChoiceState.getState();
      if (uploadChoice == "code") {
        codeFilesInput.click();
      }
      if (uploadChoice == "video") {
        videoFilesInput.click();
      }
    });

    codeDropzoneFilePicker.addEventListener("click", () => {
      codeFilesInput.click();
    });
    videoDropzoneFilePicker.addEventListener("click", () => {
      videoFilesInput.click();
    });

    codeFilesInput.addEventListener("change", (event) => {
      handleFileSelection(event.target.files);
    });

    videoFilesInput.addEventListener("change", (event) => {
      handleFileSelection(event.target.files);
    });

    viewValidationErrorMessagesBtn.addEventListener("click", () => {
      generateValidationErrorMessageList();
      assignmentErrorMessageDialog.showModal();
      assignmentErrorMessageDialog.classList.add("toast-in");
      assignmentErrorMessageDialog.classList.remove("toast-out");
    });

    assignmentErrorMessageModalCloseBtn.addEventListener("click", () => {
      assignmentErrorMessageDialog.close();
      assigmentErrorList.innerHTML = "";
      assignmentErrorMessageDialog.classList.remove("toast-in");
      assignmentErrorMessageDialog.classList.add("toast-out");
    });
  }

  function handleSelectionInternalReset() {
    resetAttemptedValidationStates();
    resetValidatedFilesSets();
    resetValidationUIStates();
  }

  return {
    init: function () {
      initializeSubscribers();
      initializeEventListiners();
      initializeDefaults();
    },
    resetFileSelectionHandler: handleSelectionInternalReset,
    setIsUploadingState
  };
})();
handleFileSelectionAndUpload.init();

const handleResetForm = (() => {
  const resetBtns = document.querySelectorAll("[data-reset-button]");
  const form = document.querySelector("[data-submitter-form]");

  const selectedCodeFilesList = document.querySelector(
    "[data-selected-code-files-list]"
  );

  const uploadingCodeFilesList = document.querySelector(
    "[data-uploading-code-files-list]"
  );

  const selectedVideoFilesList = document.querySelector(
    "[data-selected-video-files-list]"
  );

  const uploadingVideoFilesList = document.querySelector(
    "[data-uploading-video-files-list]"
  );

  function resetFormFileSelectionState() {
    selectedCodeFilesState.resetState();
    selectedVideoFilesState.resetState();
    selectedCourseState.resetState();
    codeFileValidationErrorState.resetState();
    videoFileValidationErrorState.resetState();
    videoAssignmentNumberPicker = null;
    codeAssignmentNumberPicker = null;
    selectedCodeFilesList.innerHTML = "";
    uploadingCodeFilesList.innerHTML = "";
    selectedVideoFilesList.innerHTML = "";
    uploadingVideoFilesList.innerHTML = "";
  }

  function resetForm() {
    form.reset();
    resetFormFileSelectionState();
    resetFormStepToDefault();
    handleFileSelectionAndUpload.resetFileSelectionHandler();
    uploadChoiceState.resetState();
    handleFileSelectionAndUpload.setIsUploadingState(false);
  }

  Array.from(resetBtns).forEach((resetBtn) => {
    resetBtn.addEventListener("click", resetForm);
  });

  return {
    resetFormFileSelectionState,
    resetForm
  };
})();
