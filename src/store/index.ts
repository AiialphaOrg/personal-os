import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./authSlice"
import dataReducer from "./dataSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    data: dataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
