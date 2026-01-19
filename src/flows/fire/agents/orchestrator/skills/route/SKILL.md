# Skill: Route

Analyze project state and route user to the appropriate agent.

---

## Trigger

- User runs `/fire` on initialized project
- After any agent completes its task

---

## Workflow

```xml
<skill name="route">

  <step n="1" title="Read State">
    <action>Read .specs-fire/state.yaml</action>
    <action>Parse current project state</action>
  </step>

  <step n="2" title="Check Active Run">
    <check if="active_run exists and status == in_progress">
      <output>
        Resuming active run: {active_run.id}
        Work item: {active_run.work_item}
        Mode: {active_run.mode}
      </output>
      <route-to>builder-agent</route-to>
      <stop/>
    </check>
  </step>

  <step n="3" title="Check Pending Work Items">
    <action>Find work items with status == pending</action>
    <check if="pending work items exist">
      <output>
        Ready to execute: {next_work_item.title}
        Complexity: {next_work_item.complexity}
        Mode: {next_work_item.mode}

        Start execution? [Y/n/skip]
      </output>
      <check if="response == y">
        <route-to>builder-agent</route-to>
      </check>
      <check if="response == skip">
        <action>Mark work item as skipped</action>
        <action>Re-evaluate next work item</action>
      </check>
      <stop/>
    </check>
  </step>

  <step n="4" title="Check Active Intent">
    <action>Find intents with status == in_progress</action>
    <check if="active intent has no work items">
      <output>
        Intent "{intent.title}" needs decomposition.
        Routing to Planner to create work items.
      </output>
      <route-to>planner-agent (work-item-decompose)</route-to>
      <stop/>
    </check>
    <check if="all work items completed">
      <action>Mark intent as completed</action>
      <output>
        Intent "{intent.title}" completed!

        Work items delivered:
        {list completed work items}

        Ready for next intent? [Y/n]
      </output>
    </check>
  </step>

  <step n="5" title="No Active Work">
    <output>
      No active work. Ready for a new intent.

      What do you want to build?
    </output>
    <route-to>planner-agent (intent-capture)</route-to>
  </step>

</skill>
```

---

## Routing Decision Tree

```
state.yaml
    │
    ├── active_run? ──────────────> Builder (resume)
    │
    ├── pending work items? ──────> Builder (execute)
    │
    ├── intent without work items? > Planner (decompose)
    │
    └── no active intents ────────> Planner (capture)
```

---

## Context Passed to Agents

**To Planner:**
```yaml
context:
  action: intent-capture | work-item-decompose
  intent_id: {if decomposing}
```

**To Builder:**
```yaml
context:
  action: execute | resume
  work_item_id: {work item to execute}
  run_id: {if resuming}
  mode: autopilot | confirm | validate
```
