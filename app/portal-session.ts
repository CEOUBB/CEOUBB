import type { CourseActivity, CourseGradebook } from "../lib/firebase-classroom-client";
import type { AcademicSectionSummary } from "../lib/courses";
import type { SectionMembership } from "../lib/section-roles";
import type { CommunicationState } from "../lib/communications.ts";
import type { SessionState, User } from "../lib/portal-utils";

// Implements: REQ-QMD-01
export type PortalSessionState = {
  user: User | null;
  checking: boolean;
  memberships: SectionMembership[];
  academicSections: AcademicSectionSummary[] | null;
  archivedNextCursor: string | null;
  archivedLoading: boolean;
  activity: CourseActivity[];
  gradebooks: CourseGradebook[];
  communications: CommunicationState;
  communicationError: string;
};

export type PortalSessionAction =
  | {
      type: "SESSION_LOADED";
      user: User | null;
      memberships: SectionMembership[];
      sections: AcademicSectionSummary[] | null;
      archivedNextCursor: string | null;
    }
  | {
      type: "SET_CHECKING";
      checking: boolean;
    }
  | {
      type: "SIGN_IN_SESSION";
      session: SessionState;
    }
  | {
      type: "SET_USER_PHOTO";
      photoUrl?: string;
    }
  | {
      type: "SET_MEMBERSHIPS";
      memberships: SectionMembership[];
    }
  | {
      type: "SET_ACADEMIC_SECTIONS";
      sections: AcademicSectionSummary[] | null;
    }
  | {
      type: "SET_ARCHIVED_LOADING";
      loading: boolean;
    }
  | {
      type: "APPEND_ARCHIVED_SECTIONS";
      sections: AcademicSectionSummary[];
      nextCursor: string | null;
    }
  | {
      type: "SET_ACTIVITY";
      activity: CourseActivity[];
    }
  | {
      type: "SET_GRADEBOOKS";
      gradebooks: CourseGradebook[];
    }
  | {
      type: "SET_COMMUNICATIONS";
      communications: CommunicationState;
    }
  | {
      type: "SET_COMMUNICATION_ERROR";
      error: string;
    }
  | {
      type: "LOGOUT";
    };

export function portalSessionReducer(
  state: PortalSessionState,
  action: PortalSessionAction
): PortalSessionState {
  switch (action.type) {
    case "SESSION_LOADED":
      return {
        ...state,
        user: action.user,
        memberships: action.memberships.length > 0 ? action.memberships : state.memberships,
        academicSections: action.sections,
        archivedNextCursor: action.archivedNextCursor,
        checking: false,
      };
    case "SET_CHECKING":
      return { ...state, checking: action.checking };
    case "SIGN_IN_SESSION":
      return {
        ...state,
        user: action.session.user,
        memberships: action.session.memberships,
        academicSections: action.session.sections ?? [],
        archivedNextCursor: action.session.archivedNextCursor,
        checking: false,
      };
    case "SET_USER_PHOTO":
      return {
        ...state,
        user: state.user ? { ...state.user, photoUrl: action.photoUrl } : null,
      };
    case "SET_MEMBERSHIPS":
      return { ...state, memberships: action.memberships };
    case "SET_ACADEMIC_SECTIONS":
      return { ...state, academicSections: action.sections };
    case "SET_ARCHIVED_LOADING":
      return { ...state, archivedLoading: action.loading };
    case "APPEND_ARCHIVED_SECTIONS": {
      const existing = state.academicSections ?? [];
      const byId = new Map(existing.map((s) => [s.seccionId, s]));
      for (const section of action.sections) byId.set(section.seccionId, section);
      return {
        ...state,
        academicSections: [...byId.values()],
        archivedNextCursor: action.nextCursor,
        archivedLoading: false,
      };
    }
    case "SET_ACTIVITY":
      return { ...state, activity: action.activity };
    case "SET_GRADEBOOKS":
      return { ...state, gradebooks: action.gradebooks };
    case "SET_COMMUNICATIONS":
      return {
        ...state,
        communications: action.communications,
        communicationError: "",
      };
    case "SET_COMMUNICATION_ERROR":
      return { ...state, communicationError: action.error };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        memberships: [],
        academicSections: null,
        archivedNextCursor: null,
        archivedLoading: false,
        activity: [],
        gradebooks: [],
        communications: { threads: [], cursors: [] },
        communicationError: "",
      };
    default:
      return state;
  }
}
