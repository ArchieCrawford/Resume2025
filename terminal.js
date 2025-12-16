export class Terminal {
  constructor(resumeData = null) {
    this.overlay = document.getElementById('terminal-overlay');
    this.content = document.getElementById('terminal-content');
    this.input = document.getElementById('terminal-input');
    this.prompt = document.getElementById('terminal-prompt');
    
    this.resumeData = resumeData;
    this.history = [];
    this.historyIndex = -1;
    this.commands = this.setupCommands();
    
    this.setupEventListeners();
  }

  setResumeData(data) {
    this.resumeData = data;
    this.commands = this.setupCommands(); // Refresh commands with new data
    this.updatePrompt(); // Update prompt with user name
    
    // Display suggested commands on load if available
    if (data.terminal && data.terminal.suggestedCommands) {
      const suggestions = data.terminal.suggestedCommands.join(', ');
      this.writeLine(`\nSuggested commands: ${suggestions}`);
    }
  }

  setupCommands() {
    const baseCommands = {
      help: {
        description: 'Show available commands',
        execute: () => {
          let output = '\nAvailable commands:\n\n';
          
          // Group commands
          const resumeCommands = ['intro', 'skills', 'experience', 'education', 'contact', 'projects', 'certs'];
          const actionCommands = ['download', 'linkedin', 'github', 'website'];
          const systemCommands = ['help', 'clear', 'history', 'date', 'whoami'];
          
          output += 'Resume Commands:\n';
          resumeCommands.forEach(cmd => {
            if (this.commands[cmd]) {
              output += `  ${cmd.padEnd(15)} - ${this.commands[cmd].description}\n`;
            }
          });
          
          output += '\nActions:\n';
          actionCommands.forEach(cmd => {
            if (this.commands[cmd]) {
              output += `  ${cmd.padEnd(15)} - ${this.commands[cmd].description}\n`;
            }
          });
          
          output += '\nSystem:\n';
          systemCommands.forEach(cmd => {
            if (this.commands[cmd]) {
              output += `  ${cmd.padEnd(15)} - ${this.commands[cmd].description}\n`;
            }
          });
          
          // Show aliases if available
          if (this.resumeData && this.resumeData.terminal && this.resumeData.terminal.aliases) {
            const aliases = this.resumeData.terminal.aliases;
            if (Object.keys(aliases).length > 0) {
              output += '\nAliases:\n';
              for (const [alias, target] of Object.entries(aliases)) {
                output += `  ${alias.padEnd(15)} -> ${target}\n`;
              }
            }
          }
          
          return output;
        },
      },
      clear: {
        description: 'Clear terminal screen',
        execute: () => {
          this.content.textContent = '';
          return null;
        },
      },
      date: {
        description: 'Show current date and time',
        execute: () => {
          return `\n${new Date().toString()}\n`;
        },
      },
      whoami: {
        description: 'Display current user',
        execute: () => {
          if (this.resumeData) {
            if (this.resumeData.identity) {
              return `\n${this.resumeData.identity.name}\n${this.resumeData.identity.headline}\n`;
            } else if (this.resumeData.name) {
              return `\n${this.resumeData.name}\n${this.resumeData.title}\n`;
            }
          }
          return '\nhacker@cyberdesk\n';
        },
      },
      history: {
        description: 'Show command history',
        execute: () => {
          let output = '\n';
          this.history.forEach((cmd, i) => {
            output += `${(i + 1).toString().padStart(4)}  ${cmd}\n`;
          });
          return output;
        },
      },
    };

    // Add resume-specific commands if data is available
    if (this.resumeData) {
      baseCommands.intro = {
        description: 'About me',
        execute: () => {
          let output = '\n';
          
          // Support new structure (intro.lines) or old structure (intro array)
          if (this.resumeData.intro) {
            if (this.resumeData.intro.lines) {
              this.resumeData.intro.lines.forEach(line => {
                output += line + '\n';
              });
              
              // Add values if available
              if (this.resumeData.intro.values && this.resumeData.intro.values.length > 0) {
                output += '\nCore values:\n';
                this.resumeData.intro.values.forEach(value => {
                  output += `  • ${value}\n`;
                });
              }
            } else if (Array.isArray(this.resumeData.intro)) {
              // Old structure - array of lines
              this.resumeData.intro.forEach(line => {
                output += line + '\n';
              });
            }
          }
          
          return output + '\n';
        },
      };

      baseCommands.skills = {
        description: 'Technical skills',
        execute: () => {
          let output = '\nTECHNICAL SKILLS\n' + '='.repeat(50) + '\n\n';
          for (const [category, skills] of Object.entries(this.resumeData.skills)) {
            output += `${category}:\n`;
            skills.forEach(skill => {
              output += `  • ${skill}\n`;
            });
            output += '\n';
          }
          return output;
        },
      };

      baseCommands.experience = {
        description: 'Work experience',
        execute: () => {
          let output = '\nWORK EXPERIENCE\n' + '='.repeat(50) + '\n\n';
          this.resumeData.experience.forEach(exp => {
            // Support both old structure (position/period) and new structure (title/dates)
            const title = exp.title || exp.position;
            const location = exp.location || '';
            
            output += `${exp.company} - ${title}\n`;
            
            // Handle dates object or period string
            if (exp.dates) {
              const startDate = exp.dates.start || '';
              const endDate = exp.dates.end || 'Present';
              output += `${startDate} - ${endDate}`;
              if (location) output += ` | ${location}`;
              output += '\n';
            } else if (exp.period) {
              output += `${exp.period}`;
              if (location) output += ` | ${location}`;
              output += '\n';
            }
            
            // Show employment type if available
            if (exp.employmentType && exp.employmentType.trim()) {
              output += `(${exp.employmentType})\n`;
            }
            
            output += '\n';
            
            // Handle highlights or description
            const items = exp.highlights || exp.description || [];
            items.forEach(item => {
              output += `  • ${item}\n`;
            });
            output += '\n';
          });
          return output;
        },
      };

      baseCommands.education = {
        description: 'Education background',
        execute: () => {
          let output = '\nEDUCATION\n' + '='.repeat(50) + '\n\n';
          this.resumeData.education.forEach(edu => {
            // Support both old (institution) and new (school) structure
            const schoolName = edu.school || edu.institution;
            const location = edu.location || '';
            
            output += `${schoolName}\n`;
            output += `${edu.degree}\n`;
            
            // Handle graduationYear or period
            if (edu.graduationYear) {
              output += `Graduated: ${edu.graduationYear}`;
            } else if (edu.period) {
              output += `${edu.period}`;
            }
            
            if (location) {
              output += ` | ${location}`;
            }
            output += '\n\n';
            
            // Add highlights if available
            if (edu.highlights && edu.highlights.length > 0) {
              edu.highlights.forEach(item => {
                output += `  • ${item}\n`;
              });
              output += '\n';
            }
          });
          return output;
        },
      };

      baseCommands.contact = {
        description: 'Contact information',
        execute: () => {
          const c = this.resumeData.contact;
          let output = '\nCONTACT INFORMATION\n' + '='.repeat(50) + '\n\n';
          output += `Email:    ${c.email}\n`;
          output += `Phone:    ${c.phone}\n`;
          output += `Location: ${c.location}\n`;
          output += `Website:  ${c.website}\n`;
          output += `LinkedIn: ${c.linkedin}\n`;
          output += `GitHub:   ${c.github}\n`;
          return output + '\n';
        },
      };

      baseCommands.download = {
        description: 'Download resume PDF',
        execute: () => {
          // Trigger download
          const link = document.createElement('a');
          link.href = '/resume.pdf';
          link.download = 'resume.pdf';
          link.click();
          return '\nInitiating download...\nresume.pdf downloaded successfully!\n';
        },
      };

      baseCommands.linkedin = {
        description: 'Open LinkedIn profile',
        execute: () => {
          if (this.resumeData.contact.linkedin) {
            window.open(this.resumeData.contact.linkedin, '_blank');
            return '\nOpening LinkedIn profile in new tab...\n';
          }
          return '\nLinkedIn profile URL not configured.\n';
        },
      };

      baseCommands.github = {
        description: 'Open GitHub profile',
        execute: () => {
          if (this.resumeData.contact.github) {
            window.open(this.resumeData.contact.github, '_blank');
            return '\nOpening GitHub profile in new tab...\n';
          }
          return '\nGitHub profile URL not configured.\n';
        },
      };

      baseCommands.website = {
        description: 'Open personal website',
        execute: () => {
          if (this.resumeData.contact.website) {
            window.open(this.resumeData.contact.website, '_blank');
            return '\nOpening website in new tab...\n';
          }
          return '\nWebsite URL not configured.\n';
        },
      };

      // Add projects command if projects exist
      if (this.resumeData.projects && this.resumeData.projects.length > 0) {
        baseCommands.projects = {
          description: 'View personal projects',
          execute: () => {
            let output = '\nPROJECTS\n' + '='.repeat(50) + '\n\n';
            this.resumeData.projects.forEach(project => {
              output += `${project.name}\n`;
              output += `${project.summary || project.description || ''}\n\n`;
              
              if (project.stack && project.stack.length > 0) {
                output += `Tech: ${project.stack.join(', ')}\n`;
              } else if (project.tech && project.tech.length > 0) {
                output += `Tech: ${project.tech.join(', ')}\n`;
              }
              
              if (project.links && project.links.length > 0) {
                project.links.forEach(link => {
                  if (link.url) {
                    output += `${link.label}: ${link.url}\n`;
                  }
                });
              } else if (project.link) {
                output += `Link: ${project.link}\n`;
              }
              
              output += '\n';
            });
            return output;
          },
        };
      }

      // Add certifications command if they exist
      if (this.resumeData.certifications && this.resumeData.certifications.length > 0) {
        baseCommands.certs = {
          description: 'View certifications',
          execute: () => {
            let output = '\nCERTIFICATIONS\n' + '='.repeat(50) + '\n\n';
            this.resumeData.certifications.forEach(cert => {
              output += `• ${cert.name}`;
              if (cert.issuer) output += ` (${cert.issuer})`;
              if (cert.year) output += ` - ${cert.year}`;
              output += '\n';
            });
            return output + '\n';
          },
        };
      }
    }

    return baseCommands;
  }

  setupEventListeners() {
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.executeCommand();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.autocomplete();
      }
    });

    // Auto-focus input when terminal is visible
    this.overlay.addEventListener('click', () => {
      this.input.focus();
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K to focus terminal
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (this.overlay.classList.contains('visible')) {
          this.input.focus();
        }
      }
    });
  }

  updatePrompt() {
    if (this.resumeData) {
      // Use custom prompt if defined, otherwise generate from name
      if (this.resumeData.terminal && this.resumeData.terminal.prompt) {
        this.prompt.textContent = this.resumeData.terminal.prompt;
      } else if (this.resumeData.identity && this.resumeData.identity.handle) {
        this.prompt.textContent = `${this.resumeData.identity.handle}@portfolio $`;
      } else if (this.resumeData.identity && this.resumeData.identity.name) {
        const username = this.resumeData.identity.name.toLowerCase().replace(/\s+/g, '');
        this.prompt.textContent = `${username}@portfolio $`;
      } else if (this.resumeData.name) {
        // Fallback to old structure
        const username = this.resumeData.name.toLowerCase().replace(/\s+/g, '');
        this.prompt.textContent = `${username}@portfolio $`;
      }
    }
  }

  show() {
    this.overlay.classList.add('visible');
    this.input.focus();
  }

  hide() {
    this.overlay.classList.remove('visible');
  }

  executeCommand() {
    const commandLine = this.input.value.trim();
    
    if (!commandLine) {
      this.input.value = '';
      return;
    }

    // Add to history
    this.history.push(commandLine);
    this.historyIndex = this.history.length;

    // Display command in terminal
    this.writeLine(`${this.prompt.textContent} ${commandLine}`);

    // Parse command and arguments
    const parts = commandLine.split(' ');
    let command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check for aliases
    if (this.resumeData && this.resumeData.terminal && this.resumeData.terminal.aliases) {
      const aliases = this.resumeData.terminal.aliases;
      if (aliases[command]) {
        // Replace with alias target
        const aliasTarget = aliases[command];
        const aliasParts = aliasTarget.split(' ');
        command = aliasParts[0];
        // Prepend any args from alias
        if (aliasParts.length > 1) {
          args.unshift(...aliasParts.slice(1));
        }
      }
    }

    // Execute command
    if (this.commands[command]) {
      const output = this.commands[command].execute(args);
      if (output) {
        this.write(output);
      }
    } else {
      this.write(`\nCommand not found: ${command}\nType 'help' for available commands.\n`);
    }

    // Clear input
    this.input.value = '';
    this.scrollToBottom();
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.history.length) {
      this.historyIndex = this.history.length;
      this.input.value = '';
      return;
    }

    this.input.value = this.history[this.historyIndex];
    
    // Move cursor to end
    setTimeout(() => {
      this.input.setSelectionRange(this.input.value.length, this.input.value.length);
    }, 0);
  }

  autocomplete() {
    const partial = this.input.value.toLowerCase();
    if (!partial) return;

    const matches = Object.keys(this.commands).filter(cmd => 
      cmd.startsWith(partial)
    );

    if (matches.length === 1) {
      this.input.value = matches[0];
    } else if (matches.length > 1) {
      this.write(`\n${matches.join('  ')}\n`);
      this.scrollToBottom();
    }
  }

  write(text) {
    this.content.textContent += text;
  }

  writeLine(text) {
    this.content.textContent += text + '\n';
  }

  scrollToBottom() {
    this.overlay.scrollTop = this.overlay.scrollHeight;
  }
}
