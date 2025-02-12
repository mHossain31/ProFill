document.addEventListener('DOMContentLoaded', function() {
  // Template functions
  function createSocialLinkTemplate(data = {}) {
    const container = document.createElement('div');
    container.className = 'flex space-x-2 mb-2';
    container.innerHTML = `
      <select class="custom-input w-1/3 social-type">
        <option value="linkedin" ${data.type === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
        <option value="github" ${data.type === 'github' ? 'selected' : ''}>GitHub</option>
        <option value="kaggle" ${data.type === 'kaggle' ? 'selected' : ''}>Kaggle</option>
        <option value="facebook" ${data.type === 'facebook' ? 'selected' : ''}>Facebook</option>
        <option value="portfolio" ${data.type === 'portfolio' ? 'selected' : ''}>Portfolio</option>
      </select>
      <input type="url" class="custom-input w-2/3 social-url" value="${data.url || ''}">
      <button class="bg-red-500 text-white px-3 rounded-lg">×</button>
    `;
    return container;
  }

  function createEducationTemplate(data = {}) {
    const container = document.createElement('div');
    container.className = 'entry-card';
    container.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">Degree</label>
          <input type="text" class="custom-input edu-degree" value="${data.degree || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">University</label>
          <input type="text" class="custom-input edu-university" value="${data.university || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">Start Date</label>
          <input type="month" class="custom-input edu-start" value="${data.startDate || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">End Date</label>
          <input type="month" class="custom-input edu-end" value="${data.endDate || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">GPA</label>
          <input type="text" class="custom-input edu-gpa" value="${data.gpa || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">Honors/Awards</label>
          <input type="text" class="custom-input edu-honors" value="${data.honors || ''}">
        </div>
      </div>
      <button class="bg-red-500 text-white px-3 py-1 rounded-lg mt-2">Delete</button>
    `;
    return container;
  }

  function createExperienceTemplate(data = {}) {
    const container = document.createElement('div');
    container.className = 'entry-card';
    container.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">Position</label>
          <input type="text" class="custom-input exp-position" value="${data.position || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">Company</label>
          <input type="text" class="custom-input exp-company" value="${data.company || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">Start Date</label>
          <input type="month" class="custom-input exp-start" value="${data.startDate || ''}">
        </div>
        <div class="input-group">
          <label class="block text-sm font-medium mb-1">End Date</label>
          <input type="month" class="custom-input exp-end" value="${data.endDate || ''}">
        </div>
      </div>
      <div class="input-group mt-2">
        <label class="block text-sm font-medium mb-1">Responsibilities</label>
        <textarea class="custom-input exp-responsibilities" rows="3">${data.responsibilities || ''}</textarea>
      </div>
      <button class="bg-red-500 text-white px-3 py-1 rounded-lg mt-2">Delete</button>
    `;
    return container;
  }

  // Tab functionality
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active', 'text-blue-600', 'border-b-2', 'border-blue-600'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      tab.classList.add('active', 'text-blue-600', 'border-b-2', 'border-blue-600');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Add button handlers
  document.getElementById('addSocialLink').addEventListener('click', () => {
    const container = document.getElementById('socialLinksContainer');
    container.appendChild(createSocialLinkTemplate());
  });

  document.getElementById('addEducation').addEventListener('click', () => {
    const container = document.getElementById('educationContainer');
    container.appendChild(createEducationTemplate());
  });

  document.getElementById('addExperience').addEventListener('click', () => {
    const container = document.getElementById('experienceContainer');
    container.appendChild(createExperienceTemplate());
  });

  // Delete button handler
  document.addEventListener('click', (e) => {
    if (e.target.matches('.bg-red-500')) {
      e.target.closest('.entry-card, .flex').remove();
    }
  });

  // Load saved data
  chrome.storage.sync.get(null, function(data) {
    // Load personal information - using specific classes
    const personalFields = {
      firstName: '.personal-first',
      middleInitial: '.personal-middle',
      lastName: '.personal-last',
      email: '.personal-email',
      phone: '.personal-phone',
      title: '.personal-title',
      street: '.personal-street',
      city: '.personal-city',
      state: '.personal-state',
      zipCode: '.personal-zip',
      technicalSkills: '.skills-technical',
      tools: '.skills-tools'
    };

    // Load personal information using the class selectors
    Object.entries(personalFields).forEach(([key, selector]) => {
      const element = document.querySelector(selector);
      if (element && data[key]) {
        element.value = data[key];
      }
    });

    // Load social links
    if (data.socialLinks) {
      const container = document.getElementById('socialLinksContainer');
      data.socialLinks.forEach(link => {
        container.appendChild(createSocialLinkTemplate(link));
      });
    }

    // Load education entries
    if (data.education) {
      const container = document.getElementById('educationContainer');
      data.education.forEach(edu => {
        container.appendChild(createEducationTemplate(edu));
      });
    }

    // Load experience entries
    if (data.experience) {
      const container = document.getElementById('experienceContainer');
      data.experience.forEach(exp => {
        container.appendChild(createExperienceTemplate(exp));
      });
    }
  });

  // Save button handler
  document.getElementById('saveButton').addEventListener('click', function() {
    try {
      const data = {
        // Personal information using specific classes
        firstName: document.querySelector('.personal-first').value,
        middleInitial: document.querySelector('.personal-middle').value,
        lastName: document.querySelector('.personal-last').value,
        email: document.querySelector('.personal-email').value,
        phone: document.querySelector('.personal-phone').value,
        title: document.querySelector('.personal-title').value,
        street: document.querySelector('.personal-street').value,
        city: document.querySelector('.personal-city').value,
        state: document.querySelector('.personal-state').value,
        zipCode: document.querySelector('.personal-zip').value,
        technicalSkills: document.querySelector('.skills-technical').value,
        tools: document.querySelector('.skills-tools').value,

        // Social links using specific classes
        socialLinks: Array.from(document.getElementById('socialLinksContainer').children).map(link => ({
          type: link.querySelector('.social-type').value,
          url: link.querySelector('.social-url').value
        })),

        // Education entries using specific classes
        education: Array.from(document.getElementById('educationContainer').children).map(edu => ({
          degree: edu.querySelector('.edu-degree').value,
          university: edu.querySelector('.edu-university').value,
          startDate: edu.querySelector('.edu-start').value,
          endDate: edu.querySelector('.edu-end').value,
          gpa: edu.querySelector('.edu-gpa').value,
          honors: edu.querySelector('.edu-honors').value
        })),

        // Experience entries using specific classes
        experience: Array.from(document.getElementById('experienceContainer').children).map(exp => ({
          position: exp.querySelector('.exp-position').value,
          company: exp.querySelector('.exp-company').value,
          startDate: exp.querySelector('.exp-start').value,
          endDate: exp.querySelector('.exp-end').value,
          responsibilities: exp.querySelector('.exp-responsibilities').value
        }))
      };

      chrome.storage.sync.set(data, function() {
        const saveBtn = document.getElementById('saveButton');
        saveBtn.textContent = 'Saved!';
        saveBtn.classList.add('bg-green-500');
        setTimeout(() => {
          saveBtn.textContent = 'Save';
          saveBtn.classList.remove('bg-green-500');
        }, 1500);
      });
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving data. Please make sure all fields are properly filled.');
    }
  });

  // Fill button handler with improved error handling
  document.getElementById('fillButton').addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, { action: "fill_form" });
    } catch (error) {
      console.error('Error:', error);
      if (error.message.includes('Cannot access contents of url')) {
        alert('ProFill cannot run on this page. Please try on a job application page.');
      } else {
        alert('Please refresh the page and try again.');
      }
    }
  });
});