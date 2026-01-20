# Skill: Run Plan

Plan the scope of a run by discovering available work items and suggesting groupings.

---

## Trigger

- After work-item decomposition completes
- User wants to start execution
- Pending work items exist

---

## Degrees of Freedom

**MEDIUM** — Present smart grouping suggestions but let user choose scope.

---

## Critical Clarifications

### Dependencies Mean Sequential Execution, NOT Separate Runs

**IMPORTANT**: When work items have dependencies:
- They execute **sequentially within the SAME run**
- They do **NOT** require separate runs
- The dependent item waits for its dependency to complete before starting

**Example**: If item 05 depends on item 04:
- **CORRECT**: ONE run with both items, 04 executes first, then 05
- **WRONG**: TWO separate runs

### All Options Can Include Multiple Items Per Run

| Option | Items Per Run | Execution |
|--------|---------------|-----------|
| Single | 1 item | One at a time, separate runs |
| Batch | Multiple items (same mode) | Sequential within run |
| Wide | All compatible items | Sequential within run |

---

## Workflow

```xml
<skill name="run-plan">

  <mandate>
    DISCOVER all available work - both in state.yaml AND file system.
    SUGGEST smart groupings based on mode, dependencies, and user history.
    LEARN from user choices to improve future recommendations.
    NEVER force a scope - always let user choose.
    DEPENDENCIES = SEQUENTIAL EXECUTION, NOT SEPARATE RUNS.
  </mandate>

  <step n="1" title="Discover Available Work">
    <action>Read state.yaml for known intents and work items</action>
    <action>Scan .specs-fire/intents/ for intent briefs not in state</action>
    <action>Scan .specs-fire/intents/*/work-items/ for work items not in state</action>

    <reconcile>
      <check if="file exists but not in state">
        <action>Parse file frontmatter for metadata</action>
        <action>Add to state.yaml as pending</action>
        <output>Discovered: {item} from {intent} (not in state)</output>
      </check>
      <check if="in state but file missing">
        <output>Warning: {item} in state but file not found</output>
      </check>
    </reconcile>
  </step>

  <step n="2" title="Collect Pending Work Items">
    <action>Filter work items with status == pending</action>
    <action>Group by intent</action>
    <action>Note mode (after autonomy_bias applied) for each</action>
    <action>Identify dependencies within and across intents</action>

    <check if="no pending work items">
      <output>
        No pending work items found.

        Create a new intent? [Y/n]
      </output>
      <check if="response == y">
        <route-to>planner-agent (intent-capture)</route-to>
      </check>
      <stop/>
    </check>
  </step>

  <step n="3" title="Analyze Groupings">
    <action>Read workspace.autonomy_bias from state.yaml</action>
    <action>Read workspace.run_scope_preference from state.yaml (if exists)</action>

    <grouping-rules>
      <rule>Dependencies = SEQUENTIAL execution in SAME run (NOT separate runs)</rule>
      <rule>Different modes CAN be in same run (executed sequentially)</rule>
      <rule>Cross-intent items allowed in same run if compatible</rule>
      <rule>Validate mode items may benefit from running alone (more checkpoints)</rule>
    </grouping-rules>

    <generate-options>
      <option name="single">
        Each work item in its own run
        Total runs: {count of pending items}
      </option>

      <option name="batch">
        All pending items in ONE run
        Execute sequentially (dependencies respected by order)
        Checkpoints pause at confirm/validate items
        Total runs: 1
      </option>

      <option name="wide">
        Same as batch - all items in one run
        Total runs: 1
      </option>
    </generate-options>
  </step>

  <step n="4" title="Present Options">
    <action>Determine recommended option based on:</action>
    <substep>autonomy_bias (autonomous→batch, controlled→single)</substep>
    <substep>run_scope_preference (user's historical choice)</substep>
    <substep>Number of pending items (few items→single is fine)</substep>

    <output>
      ## Run Planning

      **Found**: {count} pending work items across {intent_count} intent(s)

      {for each intent with pending items}
      **{intent.title}**:
      {for each pending item}
      - {item.title} ({item.mode})
      {/for}
      {/for}

      {if dependencies exist}
      **Dependencies** (determines execution order):
      - {dependent_item} depends on {dependency_item}
      {/if}

      ---

      **How would you like to execute?**

      **[1] One at a time** — {single_count} separate runs
          Most controlled, review after each run

      **[2] Sequential chain** — 1 run with {count} items (Recommended)
          Execute in order: {item1} → {item2} → ...
          Checkpoints pause at confirm/validate items

      **[3] All together** — Same as [2]
          1 run, sequential execution

      Choose [1/2/3]:
    </output>
  </step>

  <step n="5" title="Process Choice">
    <check if="response == 1">
      <set>run_scope = single</set>
      <set>work_items_for_run = [first_pending_item]</set>
    </check>
    <check if="response == 2 or response == 3">
      <set>run_scope = batch</set>
      <set>work_items_for_run = all_pending_items_in_dependency_order</set>
    </check>
  </step>

  <step n="6" title="Learn Preference">
    <action>Update workspace.run_scope_preference in state.yaml</action>
    <action>Add to workspace.run_scope_history (keep last 10)</action>

    <history-entry>
      choice: {run_scope}
      items_count: {count}
      timestamp: {now}
    </history-entry>

    <note>
      After 3+ consistent choices, start pre-selecting that option
      and ask "Proceed with {preference}? [Y/n/change]" instead
    </note>
  </step>

  <step n="7" title="Confirm Run">
    <output>
      Starting run with {count} work item(s):

      {for each item in work_items_for_run}
      {index}. {item.title} ({item.mode})
      {/for}

      Items will execute sequentially within this run.
      {if any item is confirm or validate}
      Checkpoints will pause for approval at confirm/validate items.
      {/if}

      ---

      Begin execution? [Y/n]
    </output>
    <check if="response == y">
      <invoke-skill args="work_items_for_run, run_scope">run-execute</invoke-skill>
    </check>
  </step>

</skill>
```

---

## State Schema Updates

**workspace section additions**:
```yaml
workspace:
  # ... existing fields ...
  run_scope_preference: batch  # single | batch | wide (learned)
  run_scope_history:
    - choice: batch
      items_count: 4
      timestamp: 2026-01-19T10:00:00Z
```

**active_run with multi-item support**:
```yaml
active_run:
  id: run-001
  scope: batch  # single | batch | wide
  work_items:
    - id: 01-stats-data-model
      intent: session-stats
      mode: autopilot
      status: completed
    - id: 02-stats-api-endpoint
      intent: session-stats
      mode: autopilot
      status: in_progress
  current_item: 02-stats-api-endpoint
  started: 2026-01-19T10:00:00Z
```

---

## File Discovery Logic

```
.specs-fire/
├── intents/
│   ├── user-auth/
│   │   ├── brief.md           ← Parse frontmatter for intent metadata
│   │   └── work-items/
│   │       ├── login-endpoint.md   ← Parse for work item metadata
│   │       └── session-mgmt.md
│   └── analytics/
│       ├── brief.md
│       └── work-items/
│           └── dashboard.md
```

**Frontmatter parsing**:
- Extract `id`, `title`, `status` from YAML frontmatter
- If status missing, default to `pending`
- If in file but not state.yaml, add to state

---

## Grouping Algorithm

```
1. Collect all pending items with their modes
2. Build dependency graph
3. Sort items in dependency order (dependencies first)
4. For "single" option:
   - Each item is its own run
5. For "batch" or "wide" option:
   - ALL items in ONE run
   - Execution order follows dependency graph
   - Checkpoints pause at confirm/validate items
```

---

## Recommendation Logic

```
IF run_scope_history has 3+ same choices:
  pre_selected = most_common_choice

ELSE IF autonomy_bias == autonomous:
  recommended = batch (all in one run)

ELSE IF autonomy_bias == controlled:
  recommended = single

ELSE: # balanced
  IF pending_count <= 2:
    recommended = single
  ELSE:
    recommended = batch
```
