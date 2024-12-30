const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5239"
    : `http://${window.location.hostname}:5239`;

//global state variables and function

const createStateManager = (initialState = null, isDynamic = false) => {
  let state = initialState;
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
    }
  };
};

const userState = createStateManager(null);
const userIdState = createStateManager("");
const selectedCourseState = createStateManager("Java");

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

function showDialog(message, action) {
  dialogModalHandler.showDialog(message, action);
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

function getCourseAssignmentMetadata(assigmentType) {
  const studentId = getCurrentUserData().studentId;
  let requestData = {};
  requestData["studentId"] = studentId;
  requestData["assignmentType"] = assigmentType;

  try {
    const response =
      handleChooseCourseStep.getCourseAssignmentMetadata(requestData);
    console.log(response);
    return response;
  } catch (error) {
    console.log("error while getting assigment metada", error);
    showToast("An error occured", "error");
  }
}

function getFetchedAssignmentMetadata() {
  return handleChooseCourseStep.assignmentMetadata;
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
        }
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

  async function submitStudentDetailsRequestAction(data) {
    try {
      const response = await submitStudentDetailsRequest(data);
      console.log(response);
      if (response.status == "Present") {
        showToast(response.message, "info");
      } else {
        showToast(response.message, "success");
        setCurrentStudentData(response.data);
      }
      updateUItoDefault();
    } catch (error) {
      updateUItoDefault();
      console.error(error);
      showToast("An error occured", "error");
    }
  }

  let proceededBefore = false;
  let dialogShownBefore = false;

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

  async function handleChooseCourseProceed(value) {
    proceededBefore = true;
    const isValidChoice = validateChooseCourseDropdown(value);
    if (isValidChoice) {
      updateUIonProceed();
      try {
        const requestData = computeRequestData(value);
        await getCourseAssignmentMetadata(requestData);
        proceededBefore = false;
        updateUItoDefault();
      } catch (error) {
        updateUItoDefault();
        console.log("error fetching an assignment data", error);
        showToast("An error eccured", "error");
      }
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

//Handle Files Selection Containier

const selectedCodeFilesState = createStateManager([]);
const selectedVideoFilesState = createStateManager([]);

const handleFileSelection = (() => {
  const uploadChoiceState = createStateManager("code");
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

  const selectedFilesContainer = fileUploadStepContainer.querySelector(
    "[data-selected-files-container]"
  );

  const selectedCodeFilesContainer = selectedFilesContainer.querySelector(
    "[data-selected-code-files]"
  );

  const selelecedCodeFilesList = selectedCodeFilesContainer.querySelector(
    "[data-selected-code-files-list]"
  );

  const selectedVideoFilesContainer = selectedFilesContainer.querySelector(
    "[data-selected-video-files]"
  );
  const selectedVideoFilesList = selectedVideoFilesContainer.querySelector(
    "[data-selected-video-files-list]"
  );

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

  function updateFileListItem(file) {
    const fileChoice = uploadChoiceState.getState();
  }

  function handleFileSelection(files) {
    const fileChoice = uploadChoiceState.getState();
    if (fileChoice == "code") {
      const selectedCodeFiles = selectedCodeFilesState.getState();
      for (let file of files) {
        const existingIndex = selectedCodeFiles.findIndex(
          (existingFile) => existingFile === file.name
        );
        if (existingIndex !== 1) {
          selectedCodeFiles.splice(existingIndex, 1, file);
          selectedCodeFilesState.setState(selectedCodeFiles);
        } else {
          selectedCodeFiles.push(file);
          selectedCodeFilesState.setState(selectedCodeFiles);
        }
      }
      codeFilesInput.value = "";
    } else {
      const selectedVideoFiles = selectedVideoFilesState.getState();
      for (let file of files) {
        const existingIndex = selectedVideoFiles.findIndex(
          (existingFile) => existingFile === file.name
        );
        if (existingIndex !== 1) {
          selectedVideoFiles.splice(existingIndex, 1, file);
          selectedVideoFilesState.setState(selectedVideoFiles);
        } else {
          selectedVideoFiles.push(file);
          selectedVideoFilesState.setState(selectedVideoFiles);
        }
      }
      videoFilesInput.value = "";
    }
  }

  function initializeSubscribers() {
    const requiredFileInfoUnsubscribe = uploadChoiceState.subscribe(
      computeRequiredFileInfoState
    );

    const codeFileInputUnsubscribe = selectedCourseState.subscribe((state) => {
      computeCodefilesInputState(state);
    });

    const currentUserDataUnsubscribe = userState.subscribe((state) => {
      currentUsernameHeader.textContent = `Welcome ${state.firstname}`;
    });
  }

  function initializeDefaults() {
    const selectedCourse = selectedCourseState.getState();
    const uploadChoice = uploadChoiceState.getState();
    computeCodefilesInputState(selectedCourse);
    computeRequiredFileInfoState(uploadChoice);
  }

  function initializeEventListiners() {
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
