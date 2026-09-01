import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import {
  getStoredToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
  loginWithGoogle,
  registerWithEmail,
  loginWithEmail,
  fetchCurrentUser,
  type UserSession,
} from "@/lib/api-client"


interface AuthState {
  token: string | null
  user: UserSession | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialToken = getStoredToken()
const initialUser = getStoredUser()

const initialState: AuthState = {
  token: initialToken,
  user: initialUser,
  isAuthenticated: Boolean(initialToken),
  isLoading: false,
  error: null,
}

export const googleAuthThunk = createAsyncThunk(
  "auth/googleAuth",
  async ({ email, name }: { email?: string; name?: string } = {}, { rejectWithValue }) => {
    try {
      const res = await loginWithGoogle(email, name)
      return { token: res.token, user: res.user }
    } catch (err: any) {
      return rejectWithValue(err.message || "Google sign-in failed")
    }
  }
)

export const registerThunk = createAsyncThunk(
  "auth/register",
  async ({ email, password, name }: { email: string; password?: string; name?: string }, { rejectWithValue }) => {
    try {
      const res = await registerWithEmail(email, password, name)
      return { token: res.token, user: res.user }
    } catch (err: any) {
      return rejectWithValue(err.message || "Registration failed")
    }
  }
)

export const loginDirectThunk = createAsyncThunk(
  "auth/loginDirect",
  async ({ email, password }: { email: string; password?: string }, { rejectWithValue }) => {
    try {
      const res = await loginWithEmail(email, password)
      return { token: res.token, user: res.user }
    } catch (err: any) {
      return rejectWithValue(err.message || "Login failed")
    }
  }
)


export const checkAuthThunk = createAsyncThunk(
  "auth/checkAuth",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchCurrentUser()
      return res.user
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to verify session")
    }
  }
)

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthSession: (state, action: PayloadAction<{ token: string; user: UserSession }>) => {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
      state.error = null
      setStoredSession(action.payload.token, action.payload.user)
    },
    logout: (state) => {
      state.token = null
      state.user = null
      state.isAuthenticated = false
      state.error = null
      clearStoredSession()
    },
    clearAuthError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Google Auth
      .addCase(googleAuthThunk.pending, (state) => {

        state.isLoading = true
        state.error = null
      })
      .addCase(googleAuthThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(googleAuthThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Direct Login
      .addCase(loginDirectThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginDirectThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.token = action.payload.token
        state.user = action.payload.user
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginDirectThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Check auth /me
      .addCase(checkAuthThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload
          state.isAuthenticated = true
        }
      })
      .addCase(checkAuthThunk.rejected, (state) => {
        state.token = null
        state.user = null
        state.isAuthenticated = false
        clearStoredSession()
      })
  },
})


export const { setAuthSession, logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
