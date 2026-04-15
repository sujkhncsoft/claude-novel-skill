/**
 * LangGraph: supervisor → worker → contextGate → (반복) → FINISH
 */

import { StateGraph, Annotation, END, START } from '@langchain/langgraph';

import { supervisorNode } from './agents/supervisor.js';
import { workerAgentNode } from './agents/workerAgent.js';
import { contextMonitor } from './contextMonitor.js';
import { generateHandoff } from './handoff.js';

const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (existing, incoming) => [...existing, ...incoming],
    default: () => [],
  }),

  next: Annotation({ default: () => 'supervisor' }),

  goContent: Annotation({ default: () => '' }),

  allTasks: Annotation({
    reducer: (_, incoming) => incoming ?? [],
    default: () => [],
  }),

  completedTasks: Annotation({
    reducer: (existing, incoming) => {
      if (incoming === null) return [];
      const set = new Set([...(existing ?? []), ...(incoming ?? [])]);
      return [...set];
    },
    default: () => [],
  }),

  pendingTasks: Annotation({
    reducer: (_, incoming) => incoming ?? [],
    default: () => [],
  }),

  changedFiles: Annotation({
    reducer: (existing, incoming) => {
      const set = new Set([...(existing ?? []), ...(incoming ?? [])]);
      return [...set];
    },
    default: () => [],
  }),

  handoffTriggered: Annotation({ default: () => false }),

  workerCount: Annotation({
    reducer: (_, incoming) => incoming ?? 0,
    default: () => 0,
  }),
});

async function contextGateNode(state) {
  if (contextMonitor.anyNearLimit()) {
    console.log('\n[ContextGate] 컨텍스트 임계치 도달 → 핸드오프 트리거');
    await generateHandoff(state, contextMonitor, state.goContent);
    return { next: 'handoff', handoffTriggered: true };
  }
  return { next: 'supervisor' };
}

async function handoffNode(state) {
  console.log('\n[Handoff] 작업 저장 완료. 다음 세션에서 이어서 진행하세요.');
  return {};
}

function supervisorRoute(state) {
  return state.next;
}

function contextGateRoute(state) {
  return state.next;
}

export function buildGraph() {
  const graph = new StateGraph(AgentState)
    .addNode('supervisor', supervisorNode)
    .addNode('contextGate', contextGateNode)
    .addNode('worker', workerAgentNode)
    .addNode('handoff', handoffNode)

    .addEdge(START, 'supervisor')

    .addConditionalEdges('supervisor', supervisorRoute, {
      worker: 'worker',
      FINISH: END,
    })

    .addEdge('worker', 'contextGate')

    .addConditionalEdges('contextGate', contextGateRoute, {
      supervisor: 'supervisor',
      handoff: 'handoff',
    })

    .addEdge('handoff', END);

  return graph.compile();
}

export { AgentState };
