const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5239"
    : `http://${window.location.hostname}:5239`;

//global state variables and function

// const createStateManager = (initialState = null, isDynamic = false) => {
//   let state = initialState;
//   const resetValue = initialState;
//   const subscribers = [];

//   return {
//     getState() {
//       return state;
//     },
//     setState(newState) {
//       if (
//         isDynamic &&
//         typeof state === "object" &&
//         typeof newState === "object"
//       ) {
//         state = { ...state, ...newState };
//       } else {
//         state = newState;
//       }
//       subscribers.forEach((fn) => fn(state));
//     },

//     subscribe(fn) {
//       subscribers.push(fn);
//       return () => {
//         const index = subscribers.indexOf(fn);
//         subscribers.splice(index, 1);
//       };
//     },

//     resetState() {
//       this.setState(resetValue);
//     }
//   };
// };

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
const fileNumberButtons = new Map();
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

function getCurrentUserData() {
  return userState.getState();
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
    generalContainer.style.height = `${totalHeight}px`;
  });

  resizeObserver.observe(dynamicContent);
})();

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
    uploadChoiceState.resetState();
  }

  Array.from(resetBtns).forEach((resetBtn) => {
    resetBtn.addEventListener("click", resetForm);
  });

  return {
    resetFormFileSelectionState,
    resetForm
  };
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

function computeFormToShow(hide, show, direction) {
  const formToShow = document.querySelector(`[data-step-${show}]`);
  const generalContainer = document.querySelector("[data-container]");
  generalContainer.classList.add("change-form");
  formToShow.classList.add("active");
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

//handle toast message

const handleToastMessage = (() => {
  const toastTemplate = document.querySelector("[data-toast-template]");
  const toastPlaceholder = document.querySelector("[data-toast-placeholder]");

  function updateToastContainerHeight() {
    let totalHeight = 0;
    Array.from(toastPlaceholder.children).forEach((toast) => {
      totalHeight += toast.offsetHeight;
    });
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

    updateToastContainerHeight();

    toastCloseButton.addEventListener("click", () => {
      closeToast(appendedToast);
    });

    setTimeout(() => {
      closeToast(appendedToast);
    }, 4000);
  }

  function closeToast(toast) {
    toast.classList.remove("toast-in");
    toast.classList.add("toast-out");

    toast.addEventListener(
      "animationend",
      () => {
        toastPlaceholder.removeChild(toast);
        updateToastContainerHeight();
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
        console.log(response);
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
    proceededBefore = true;
    try {
      const response = await submitStudentDetailsRequest(data);
      console.log(response);
      if (response.status == "Present") {
        showToast(response.message, "info");
      } else {
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
      proceededBefore = false;
      dialogShownBefore = false;
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

const handleFileSelection = (() => {
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

  const uploadingVideoFilesList = uploadingCodeFilesContainer.querySelector(
    "[data-uploading-video-files-list]"
  );

  const backButton =
    fileUploadStepContainer.querySelector("[data-back-button]");

  const uploadButton =
    fileUploadStepContainer.querySelector("[data-proceed-btn]");

  const spinnerSection = fileUploadStepContainer.querySelector(
    "[data-spinner-section]"
  );

  let hasAttemptedCodeSubmission = false;
  let hasAttemptedVideoSubmission = false;

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
      switch (fileChoice) {
        case "code":
          codeAssignmentNumberPicker.handleFileDeleteUnassign(file.name);
          break;
        case "video":
          videoAssignmentNumberPicker.handleFileDeleteUnassign(file.name);
          break;
      }
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
    if (fileChoice === "code") {
      const listItem = Array.from(selectedCodeFilesList.children).filter(
        (item) => item.dataset.fileName === fileName
      );
      selectedCodeFilesList.removeChild(listItem[0]);
      selectedCodeFiles.delete(fileName);
      selectedCodeFilesState.setState(selectedCodeFiles);
    } else {
      const listItem = Array.from(selectedVideoFilesList.children).filter(
        (item) => item.dataset.fileName === fileName
      );
      selectedVideoFilesList.removeChild(listItem[0]);
      selectedVideoFiles.delete(fileName);
      selectedVideoFilesState.setState(selectedVideoFiles);
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
      }
    }
  }

  function clearValidationError(fileName, fileType) {
    // if (!hasAttemptedSubmission) {
    //   return;
    // }
    const errorState =
      fileType === "code"
        ? codeFileValidationErrorState
        : videoFileValidationErrorState;

    const errors = errorState.getState();

    if (!errors.has(fileName)) {
      return;
    }

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
    });

    uploadChoiceState.subscribe((state) => {
      if (state == "code") {
        const selectedCodeFiles = selectedCodeFilesState.getState();
        if (selectedCodeFiles.size > 0) {
          uploadButton.style.display = "flex";
        } else {
          uploadButton.style.display = "none";
        }
      } else if (state == "video") {
        const selectedVideoFiles = selectedVideoFilesState.getState();
        if (selectedVideoFiles.size > 0) {
          uploadButton.style.display = "flex";
        } else {
          uploadButton.style.display = "none";
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

  function initializeDefaults() {
    const selectedCourse = selectedCourseState.getState();
    const uploadChoice = uploadChoiceState.getState();
    computeCodefilesInputState(selectedCourse);
    computeRequiredFileInfoState(uploadChoice);
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
    });

    uploadButton.addEventListener("click", () => {
      validateSelectedCodeFiles();
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
  }

  return {
    init: function () {
      initializeSubscribers();
      initializeEventListiners();
      initializeDefaults();
    }
  };
})();

handleFileSelection.init();
