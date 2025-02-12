chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "fill_form") {
    chrome.storage.sync.get(null, async function(data) {
      // Helper function to check if a field is for middle initial only
      function isInitialOnly(element) {
        return element.maxLength === 1 || 
               element.name?.toLowerCase().includes('initial') ||
               element.id?.toLowerCase().includes('initial') ||
               element.placeholder?.toLowerCase().includes('initial') ||
               element.name?.toLowerCase().includes('mi') ||
               element.id?.toLowerCase().includes('mi') ||
               element.getAttribute('size') === '1';
      }

      // Helper function to set field value and trigger events
      function setFieldValue(element, value) {
        if (element && value) {
          // Clear existing value first
          element.value = '';
          // Set new value
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('focus', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          return true;
        }
        return false;
      }

      // Helper function to find and fill field
      function fillField(selectors, value, fieldConfig = {}) {
        if (!value) return false;
        let filled = false;
        for (let selector of selectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (fieldConfig.customFill) {
              if (fieldConfig.customFill(element, value)) filled = true;
            } else {
              if (setFieldValue(element, value)) filled = true;
            }
          });
        }
        return filled;
      }

      // Helper function to find fields by common variations
      function getFieldSelectors(fieldName, additionalSelectors = []) {
        return [
          `input[name*="${fieldName}" i]`,
          `input[id*="${fieldName}" i]`,
          `input[placeholder*="${fieldName}" i]`,
          `[aria-label*="${fieldName}" i]`,
          ...additionalSelectors
        ];
      }

      // Workday specific handling
      async function fillWorkdayFields() {
        const workdaySelectors = {
          firstName: '[data-automation-id*="firstName"], [id*="firstName"], [name*="firstName"], [aria-label*="First Name"]',
          middleName: '[data-automation-id*="middleName"], [id*="middleName"], [name*="middleName"], [aria-label*="Middle Name"]',
          lastName: '[data-automation-id*="lastName"], [id*="lastName"], [name*="lastName"], [aria-label*="Last Name"]',
          email: '[data-automation-id*="email"], [id*="email"], [name*="email"], [aria-label*="Email"]',
          phone: '[data-automation-id*="phone"], [id*="phone"], [name*="phone"], [aria-label*="Phone"]',
          address: '[data-automation-id*="address"], [id*="address"], [name*="address"], [aria-label*="Address"]',
          city: '[data-automation-id*="city"], [id*="city"], [name*="city"], [aria-label*="City"]',
          state: '[data-automation-id*="state"], [id*="state"], [name*="state"], [aria-label*="State"]',
          zipCode: '[data-automation-id*="postalCode"], [id*="postalCode"], [name*="zip"], [aria-label*="Postal Code"]'
        };

        // Function to fill fields in a document or iframe
        function fillWorkdayDocument(doc) {
          Object.entries(workdaySelectors).forEach(([field, selector]) => {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(element => {
              let value = data[field];
              if (field === 'middleName' && isInitialOnly(element)) {
                value = data[field].charAt(0);
              }
              setFieldValue(element, value);
            });
          });
        }

        // Fill main document
        fillWorkdayDocument(document);

        // Fill all iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            fillWorkdayDocument(iframeDoc);
          } catch (error) {
            console.log('Cannot access iframe:', error);
          }
        });

        // Set up observer for dynamically loaded content
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.addedNodes) {
              mutation.addedNodes.forEach(node => {
                if (node.tagName === 'IFRAME') {
                  setTimeout(() => {
                    try {
                      const iframeDoc = node.contentDocument || node.contentWindow.document;
                      fillWorkdayDocument(iframeDoc);
                    } catch (error) {
                      console.log('Cannot access new iframe:', error);
                    }
                  }, 1000);
                }
              });
            }
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }

      // Check if we're on a Workday site
      if (window.location.hostname.includes('workday') || 
          window.location.hostname.includes('myworkday') ||
          window.location.hostname.includes('myworkdayjobs')) {
        await fillWorkdayFields();
      }

      // Handle name fields
      const nameFields = {
        firstName: {
          selectors: [
            'input[name="firstName"]',
            'input[name="fname"]',
            'input[name="first_name"]',
            'input[id="firstName"]',
            'input[id="fname"]',
            'input[id="first_name"]',
            'input[placeholder*="first name" i]',
            'input[name*="first" i]'
          ],
          value: data.firstName
        },
        middleName: {
          selectors: [
            'input[name*="middle_initial" i]',
            'input[name*="mi" i]',
            'input[id*="middle_initial" i]',
            'input[id*="mi" i]',
            'input[maxlength="1"][name*="middle" i]',
            'input[name="middleName"]',
            'input[name="mname"]',
            'input[name="middle_name"]',
            'input[id="middleName"]',
            'input[id="mname"]',
            'input[id="middle_name"]',
            'input[placeholder*="middle name" i]',
            'input[name*="middle" i]'
          ],
          value: data.middleInitial,
          customFill: (element, value) => {
            if (isInitialOnly(element)) {
              setFieldValue(element, value.charAt(0));
            } else {
              setFieldValue(element, value);
            }
            return true;
          }
        },
        lastName: {
          selectors: [
            'input[name="lastName"]',
            'input[name="lname"]',
            'input[name="last_name"]',
            'input[id="lastName"]',
            'input[id="lname"]',
            'input[id="last_name"]',
            'input[placeholder*="last name" i]',
            'input[name*="last" i]'
          ],
          value: data.lastName
        }
      };

      // Fill name fields
      Object.entries(nameFields).forEach(([fieldName, field]) => {
        fillField(field.selectors, field.value, {
          customFill: field.customFill
        });
      });

      // Handle full name fields
      const fullNameValue = `${data.firstName} ${data.middleInitial} ${data.lastName}`.trim();
      const fullNameSelectors = [
        'input[name*="fullname" i]',
        'input[name*="full_name" i]',
        'input[name*="complete_name" i]',
        'input[placeholder*="full name" i]',
        'input[name*="applicant_name" i]'
      ];
      
      const fullNameFields = document.querySelectorAll(fullNameSelectors.join(','));
      fullNameFields.forEach(field => {
        if (!field.value) {
          setFieldValue(field, fullNameValue);
        }
      });

      // Fill personal information
      const personalFields = {
        email: {
          selectors: [
            'input[type="email"]',
            'input[name*="email" i]',
            'input[id*="email" i]'
          ],
          value: data.email
        },
        phone: {
          selectors: [
            'input[type="tel"]',
            'input[name*="phone" i]',
            'input[name*="mobile" i]',
            'input[id*="phone" i]',
            'input[id*="mobile" i]'
          ],
          value: data.phone
        },
        title: {
          selectors: [
            'input[name*="title" i]',
            'input[name*="position" i]',
            'input[id*="title" i]',
            'input[id*="position" i]'
          ],
          value: data.title
        },
        street: {
          selectors: [
            'input[name*="street" i]',
            'input[name*="address" i]',
            'input[id*="street" i]',
            'input[id*="address" i]',
            'textarea[name*="address" i]'
          ],
          value: data.street
        },
        city: {
          selectors: [
            'input[name*="city" i]',
            'input[id*="city" i]'
          ],
          value: data.city
        },
        state: {
          selectors: [
            'input[name*="state" i]',
            'select[name*="state" i]',
            'input[id*="state" i]'
          ],
          value: data.state
        },
        zipCode: {
          selectors: [
            'input[name*="zip" i]',
            'input[name*="postal" i]',
            'input[id*="zip" i]',
            'input[id*="postal" i]'
          ],
          value: data.zipCode
        }
      };

      // Fill personal information
      Object.values(personalFields).forEach(field => {
        fillField(field.selectors, field.value);
      });

      // Fill social links
      if (data.socialLinks) {
        data.socialLinks.forEach(link => {
          const socialSelectors = [
            `input[name*="${link.type}" i]`,
            `input[name*="social" i]`,
            `input[name*="profile" i]`,
            `input[id*="${link.type}" i]`,
            `input[placeholder*="${link.type}" i]`
          ];
          fillField(socialSelectors, link.url);
        });
      }

      // Fill education entries
      if (data.education) {
        data.education.forEach((edu, index) => {
          const eduFields = {
            degree: {
              selectors: [
                `input[name*="degree" i]`,
                `input[name*="qualification" i]`,
                `input[id*="degree" i]`,
                `select[name*="degree" i]`
              ],
              value: edu.degree
            },
            university: {
              selectors: [
                `input[name*="university" i]`,
                `input[name*="school" i]`,
                `input[name*="institution" i]`,
                `input[id*="university" i]`,
                `input[id*="school" i]`
              ],
              value: edu.university
            },
            gpa: {
              selectors: [
                `input[name*="gpa" i]`,
                `input[id*="gpa" i]`
              ],
              value: edu.gpa
            },
            startDate: {
              selectors: [
                `input[name*="edu.*start" i]`,
                `input[name*="education.*begin" i]`,
                `input[id*="edu.*start" i]`,
                `input[name*="start.*date" i]`
              ],
              value: edu.startDate
            },
            endDate: {
              selectors: [
                `input[name*="edu.*end" i]`,
                `input[name*="education.*complete" i]`,
                `input[id*="edu.*end" i]`,
                `input[name*="end.*date" i]`
              ],
              value: edu.endDate
            }
          };

          Object.values(eduFields).forEach(field => {
            fillField(field.selectors, field.value);
          });
        });
      }

      // Fill experience entries
      if (data.experience) {
        data.experience.forEach((exp, index) => {
          const expFields = {
            position: {
              selectors: [
                `input[name*="position" i]`,
                `input[name*="title" i]`,
                `input[name*="role" i]`,
                `input[id*="position" i]`,
                `input[id*="title" i]`
              ],
              value: exp.position
            },
            company: {
              selectors: [
                `input[name*="company" i]`,
                `input[name*="employer" i]`,
                `input[name*="organization" i]`,
                `input[id*="company" i]`,
                `input[id*="employer" i]`
              ],
              value: exp.company
            },
            startDate: {
              selectors: [
                `input[name*="exp.*start" i]`,
                `input[name*="start.*date" i]`,
                `input[id*="exp.*start" i]`,
                `input[name*="employment.*start" i]`
              ],
              value: exp.startDate
            },
            endDate: {
              selectors: [
                `input[name*="exp.*end" i]`,
                `input[name*="end.*date" i]`,
                `input[id*="exp.*end" i]`,
                `input[name*="employment.*end" i]`
              ],
              value: exp.endDate
            },
            responsibilities: {
              selectors: [
                `textarea[name*="responsibilities" i]`,
                `textarea[name*="duties" i]`,
                `textarea[name*="description" i]`,
                `textarea[id*="responsibilities" i]`,
                `textarea[id*="duties" i]`,
                `textarea[name*="work.*description" i]`
              ],
              value: exp.responsibilities
            }
          };

          Object.values(expFields).forEach(field => {
            fillField(field.selectors, field.value);
          });
        });
      }

      // Fill skills
      if (data.technicalSkills) {
        const skillsSelectors = [
          'textarea[name*="skills" i]',
          'textarea[name*="technical" i]',
          'textarea[id*="skills" i]',
          'input[name*="skills" i]'
        ];
        fillField(skillsSelectors, data.technicalSkills);
      }

      if (data.tools) {
        const toolsSelectors = [
          'textarea[name*="tools" i]',
          'textarea[name*="technologies" i]',
          'textarea[id*="tools" i]',
          'input[name*="tools" i]'
        ];
        fillField(toolsSelectors, data.tools);
      }
    });
  }
});