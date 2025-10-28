# Manual Testing Guide - Core Functionality

This guide provides step-by-step instructions for manually testing core functionality items from the MVP checklist.

## 1. Agent Creation & Management

### Test 1.1: Verify all persona templates work correctly

**Objective:** Ensure all 10 persona templates can be selected and used to create agents.

**Steps:**
1. Open the app and navigate to create agent
2. Click on "Browse Templates" or template selector
3. For each template category, verify templates are listed:
   - **Developer:** Senior Software Developer, Code Reviewer
   - **Writer:** Technical Writer, Professional Editor
   - **Analyst:** Data Analyst, Product Manager
   - **Creative:** Creative Content Writer, Creative Brainstormer
   - **Support:** Customer Support Specialist
   - **General:** General AI Assistant

4. For each template, verify:
   - [ ] Template name displays correctly
   - [ ] Template description is clear
   - [ ] Clicking template populates the persona field
   - [ ] Persona text matches expected content
   - [ ] Can create agent with the template

**Expected Result:** All 10 templates work and populate correctly

**Status:** ⏳ Pending

---

### Test 1.2: Test agent creation with all providers

**Objective:** Create agents using Ollama, OpenRouter, and LLM7 providers.

#### Test 1.2a: Ollama Provider
**Steps:**
1. Ensure Ollama is running (`ollama serve`)
2. Click "Create Agent"
3. Select "Ollama" as provider
4. Verify models load from local Ollama instance
5. Select a model (e.g., llama3.2, qwen2.5)
6. Fill in agent name: "Test Ollama Agent"
7. Select a persona template
8. Click "Create Agent"
9. Verify agent appears in agent list
10. Verify agent can be selected for chat

**Expected Result:** 
- Models load successfully
- Agent created with Ollama provider
- Agent functional in chat

**Status:** ⏳ Pending

#### Test 1.2b: OpenRouter Provider
**Steps:**
1. Go to Settings → API Keys
2. Add OpenRouter API key (if not already added)
3. Click "Create Agent"
4. Select "OpenRouter" as provider
5. Select API key from dropdown
6. Toggle "Show free models only" ON
7. Verify free models appear (e.g., meta-llama/llama-3.2-3b-instruct:free)
8. Select a free model
9. Fill in agent name: "Test OpenRouter Agent"
10. Select a persona template
11. Click "Create Agent"
12. Verify agent appears in agent list

**Expected Result:**
- API key dropdown shows saved keys
- Free models filter works
- Agent created with OpenRouter provider
- Agent functional in chat

**Status:** ⏳ Pending

#### Test 1.2c: LLM7 Provider
**Steps:**
1. Go to Settings → API Keys
2. Add LLM7 API key (optional - can work without)
3. Click "Create Agent"
4. Select "LLM7" as provider
5. Verify models load (gpt-5-chat, etc.)
6. Select a model
7. Fill in agent name: "Test LLM7 Agent"
8. Select a persona template
9. Click "Create Agent"
10. Verify agent appears in agent list

**Expected Result:**
- Models load with or without API key
- Agent created with LLM7 provider
- Agent functional in chat

**Status:** ⏳ Pending

---

### Test 1.3: Ensure agent editing updates correctly

**Objective:** Verify that editing an agent updates all fields correctly.

**Steps:**
1. Create a test agent (any provider)
2. Note current values:
   - Name
   - Description
   - Persona
   - Provider
   - Model
3. Click edit button (⋮ menu → Edit)
4. Modify the following:
   - Change name to "Edited Agent Name"
   - Update description
   - Modify persona text
   - Change model (keep same provider)
5. Click "Save Changes"
6. Verify updates:
   - [ ] Agent name updated in UI
   - [ ] Agent button shows new name
   - [ ] Opening edit dialog shows new values
   - [ ] Agent works with new model in chat

**Expected Result:** All edits persist correctly

**Status:** ⏳ Pending

---

### Test 1.4: Verify agent deletion works (except aggregator)

**Objective:** Ensure agents can be deleted but aggregator cannot.

#### Test 1.4a: Delete Regular Agent
**Steps:**
1. Create a test agent
2. Click edit button (⋮ menu)
3. Click "Delete Agent" button
4. Verify confirmation dialog appears
5. Confirm deletion
6. Verify:
   - [ ] Agent removed from UI
   - [ ] Agent removed from database (refresh and check)
   - [ ] Success toast shown

**Expected Result:** Agent deleted successfully

**Status:** ⏳ Pending

#### Test 1.4b: Aggregator Protection
**Steps:**
1. Try to edit the Aggregator agent (has 🤖 icon)
2. Verify:
   - [ ] No delete button in edit dialog
   - [ ] Only provider and model can be changed
   - [ ] Name cannot be changed
   - [ ] Persona cannot be changed

**Expected Result:** Aggregator cannot be deleted or have name/persona changed

**Status:** ⏳ Pending

---

### Test 1.5: Test provider-per-agent configuration

**Objective:** Verify each agent can use a different provider and model.

**Steps:**
1. Create Agent 1:
   - Name: "Ollama Analyst"
   - Provider: Ollama
   - Model: llama3.2
   - Template: Data Analyst

2. Create Agent 2:
   - Name: "OpenRouter Writer"
   - Provider: OpenRouter
   - Model: meta-llama/llama-3.2-3b-instruct:free
   - Template: Technical Writer

3. Create Agent 3:
   - Name: "LLM7 Developer"
   - Provider: LLM7
   - Model: gpt-5-chat
   - Template: Senior Developer

4. Select all 3 agents for a conversation
5. Send a test prompt
6. Verify:
   - [ ] Each agent responds independently
   - [ ] Each response uses its configured provider
   - [ ] No errors in console
   - [ ] All responses appear correctly

**Expected Result:** Each agent uses its own provider/model configuration

**Status:** ⏳ Pending

---

## 2. Aggregator Setup

### Test 2.1: Test initial aggregator configuration flow

**Objective:** Verify the first-time aggregator setup experience.

**Prerequisites:** Fresh install (clear IndexedDB)

**Steps:**
1. Open app (should show empty state)
2. Verify empty state shows:
   - [ ] "Setup Aggregator" card
   - [ ] "Create Your First Agent" card
3. Click "Open Settings" on aggregator card
4. Verify:
   - [ ] Settings dialog opens
   - [ ] Aggregator tab is active
   - [ ] Blue info banner shows "Initial Setup Required"
   - [ ] Form shows provider/model selection
5. Select Ollama provider
6. Select llama3.2 model
7. Click "Apply Configuration"
8. Verify:
   - [ ] Success toast: "Aggregator configured successfully! You can now create agents and start chatting."
   - [ ] Aggregator configuration saved
   - [ ] "Setup Aggregator" card disappears from home
   - [ ] Current configuration card now shows

**Expected Result:** Smooth first-time setup with clear guidance

**Status:** ⏳ Pending

---

### Test 2.2: Verify aggregator model switching works

**Objective:** Change aggregator model and verify it persists.

**Steps:**
1. Go to Settings → Aggregator
2. Note current provider and model
3. Change to different model (same provider)
4. Click "Save Changes"
5. Verify:
   - [ ] Success toast shown
   - [ ] Current configuration updates
   - [ ] Close and reopen settings - new model shown
6. Test in conversation:
   - Create 2 agents
   - Have multi-agent conversation
   - Verify aggregator uses new model

**Expected Result:** Model switch persists and works in conversations

**Status:** ⏳ Pending

---

### Test 2.3: Test with free and paid OpenRouter models

**Objective:** Ensure both free and paid OpenRouter models can be selected for aggregator.

#### Test 2.3a: Free Models
**Steps:**
1. Go to Settings → Aggregator
2. Select OpenRouter provider
3. Select an API key
4. Toggle "Show free OpenRouter models only" ON
5. Verify:
   - [ ] Only free models shown (marked with :free)
   - [ ] Model list filtered correctly
6. Select a free model (e.g., meta-llama/llama-3.2-3b-instruct:free)
7. Click "Apply Configuration"
8. Test in multi-agent conversation

**Expected Result:** Free models work correctly

**Status:** ⏳ Pending

#### Test 2.3b: Paid Models
**Steps:**
1. Go to Settings → Aggregator
2. Select OpenRouter provider
3. Toggle "Show free OpenRouter models only" OFF
4. Verify:
   - [ ] All models shown (free + paid)
   - [ ] More models available
5. Select a paid model (e.g., anthropic/claude-3-opus)
6. Click "Apply Configuration"
7. Verify configuration saved

**Expected Result:** Both free and paid models selectable

**Status:** ⏳ Pending

---

### Test 2.4: Ensure Ollama models load correctly

**Objective:** Verify Ollama model list loads from local instance.

**Prerequisites:** Ollama running with models installed

**Steps:**
1. Ensure Ollama is running (`ollama list` shows models)
2. Go to Settings → Aggregator
3. Select Ollama provider
4. Verify:
   - [ ] "Loading models..." appears briefly
   - [ ] Model dropdown populates
   - [ ] All locally installed models appear
   - [ ] Model count shown (e.g., "15 models available")
5. Select a model
6. Apply configuration
7. Refresh page
8. Reopen settings
9. Verify selected model still shown

**Expected Result:** Ollama models load and persist correctly

**Status:** ⏳ Pending

---

### Test 2.5: Validate LLM7 integration

**Objective:** Ensure LLM7 provider works for aggregator.

**Steps:**
1. Go to Settings → Aggregator
2. Select LLM7 provider
3. Verify:
   - [ ] API key selection optional
   - [ ] Models load (gpt-5-chat, etc.)
4. Select model
5. Apply configuration
6. Create 2 test agents
7. Have multi-agent conversation
8. Verify:
   - [ ] Aggregator uses LLM7
   - [ ] Synthesis response appears
   - [ ] No CORS errors
   - [ ] Request goes through proxy

**Expected Result:** LLM7 works as aggregator provider

**Status:** ⏳ Pending

---

## Testing Checklist Summary

### Agent Creation & Management
- [ ] All 10 persona templates work
- [ ] Agent creation with Ollama works
- [ ] Agent creation with OpenRouter works
- [ ] Agent creation with LLM7 works
- [ ] Agent editing updates correctly
- [ ] Agent deletion works
- [ ] Aggregator cannot be deleted
- [ ] Provider-per-agent configuration works

### Aggregator Setup
- [ ] Initial aggregator configuration flow smooth
- [ ] Aggregator model switching works
- [ ] OpenRouter free models work
- [ ] OpenRouter paid models selectable
- [ ] Ollama models load correctly
- [ ] LLM7 integration validated

---

## Notes

### Common Issues to Watch For
1. **Model loading fails:** Check Ollama is running, API keys are valid
2. **CORS errors:** Verify all requests go through proxy routes
3. **Aggregator won't save:** Check console for validation errors
4. **Models don't appear:** Check provider API key is active

### Test Environment
- **Browser:** Chrome/Firefox (latest)
- **Ollama:** Running locally on port 11434
- **Internet:** Required for OpenRouter and LLM7

### Reporting Issues
When finding bugs, note:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Console errors (if any)
5. Browser and version

---

**Last Updated:** October 28, 2025
**Tester:** _________
**Test Date:** _________
