"use client";

import React, { useState, useRef, useMemo } from "react";
import { Upload, Users, Check, X } from "lucide-react";
import { saveUserSession } from "@/utils/sessionManager";
import { countries, getCitiesByCountry } from "@/app/utils/countriesCities";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  profilePicture?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  province?: string;
  barangay?: string;
  zipCode?: string;
  dateOfBirth?: string;
  emailNotifications?: boolean;
  messageNotifications?: boolean;
}

interface Props {
  currentUser: User | null;
  onError: (error: string) => void;
}

export function ProfileManagementComponent({ currentUser, onError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [firstName, setFirstName] = useState(currentUser?.firstName || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(
    currentUser?.phoneNumber || "",
  );
  const [country, setCountry] = useState(currentUser?.country || "");
  const [city, setCity] = useState(currentUser?.city || "");
  const [province, setProvince] = useState(currentUser?.province || "");
  const [barangay, setBarangay] = useState(currentUser?.barangay || "");
  const [zipCode, setZipCode] = useState(currentUser?.zipCode || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    currentUser?.dateOfBirth ? currentUser.dateOfBirth.split("T")[0] : "",
  );
  const [profilePicture, setProfilePicture] = useState(
    currentUser?.profilePicture || "",
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Account management state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");

  // Get available cities based on selected country
  const availableCities = useMemo(() => {
    return getCitiesByCountry(country);
  }, [country]);

  // Auto-fill zipCode based on province, city, barangay
  const autoFillZipCode = (prov: string, c: string, bar: string) => {
    if (prov && c && bar) {
      // Create a simple zipcode from the first letter of each
      const code =
        `${prov.substring(0, 1)}${c.substring(0, 1)}${bar.substring(0, 1)}000`.toUpperCase();
      setZipCode(code);
    }
  };

  const handleProfilePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!currentUser) return;
    setProfileSaving(true);
    setProfileMessage("");

    try {
      const response = await fetch(`/api/user-management/${currentUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          country,
          city,
          province,
          barangay,
          zipCode,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
          profilePicture,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }

      setProfileMessage("Profile updated successfully");

      // Save updated profile to localStorage
      const updatedUser = {
        ...currentUser,
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
        country,
        city,
        province,
        barangay,
        zipCode,
        dateOfBirth,
        profilePicture,
      } as User;
      saveUserSession(updatedUser as any);

      // Dispatch custom event to notify sidebar of profile update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileUpdated"));
      }

      setTimeout(() => setProfileMessage(""), 3000);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!currentUser || !deactivatePassword) {
      setAccountError("Password is required");
      return;
    }

    setAccountLoading(true);
    setAccountError("");
    setAccountMessage("");

    try {
      const response = await fetch(`/api/user-management/self-deactivate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({ password: deactivatePassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deactivate account");
      }

      setAccountMessage("Account deactivated successfully");
      setDeactivatePassword("");
      setShowDeactivateModal(false);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setAccountError(
        err instanceof Error ? err.message : "Failed to deactivate account",
      );
    } finally {
      setAccountLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !deletePassword) {
      setAccountError("Password is required");
      return;
    }

    setAccountLoading(true);
    setAccountError("");
    setAccountMessage("");

    try {
      const response = await fetch(`/api/user-management/self-delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUser.id),
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete account");
      }

      setAccountMessage("Account deleted successfully");
      setDeletePassword("");
      setShowDeleteModal(false);

      // Clear session and redirect to login after 2 seconds
      setTimeout(() => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("userSession");
        }
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setAccountError(
        err instanceof Error ? err.message : "Failed to delete account",
      );
    } finally {
      setAccountLoading(false);
    }
  };

  if (!currentUser) {
    return <p className="text-gray-600">Loading user data...</p>;
  }

  return (
    <div className="w-full">
      {/* Main Settings Container - with 2 margin from edge */}
      <div className="max-w-full mx-auto px-8 space-y-6">
        {/* Personal Information Section - Wider Layout */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header with Title and Saving Status */}
          <div className="border-b border-gray-200 px-8 py-4 flex items-center justify-between bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900">
              Personal information
            </h2>
            {profileSaving && (
              <div className="flex items-center gap-2 text-teal-600 text-sm">
                <div className="w-3 h-3 rounded-full bg-teal-600 animate-pulse"></div>
                Saving changes
              </div>
            )}
            {profileMessage && (
              <div className="text-green-600 text-sm flex items-center gap-2">
                <Check size={16} />
                {profileMessage}
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-6">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center gap-4 pb-6 border-b border-gray-200">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users size={40} className="text-gray-400" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                <Upload size={16} />
                Update photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
            </div>

            {/* Form Grid - Matching Screenshot Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  placeholder="Arafat"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  placeholder="Nayeem"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Phone Number{" "}
                  <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveProfile}
              disabled={profileSaving}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-sm mt-6"
            >
              {profileSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Account Management Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 px-8 py-4 bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900">Account</h2>
          </div>

          {/* Content */}
          <div className="p-8 space-y-4">
            {accountMessage && (
              <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-4">
                {accountMessage}
              </div>
            )}
            {accountError && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
                {accountError}
              </div>
            )}

            {/* Deactivate Button */}
            <button
              onClick={() => setShowDeactivateModal(true)}
              className="w-full px-6 py-3 bg-yellow-100 text-yellow-900 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors font-semibold text-sm text-left"
            >
              Deactivate Account
              <p className="text-xs font-normal text-yellow-700 mt-1">
                Hidden from other users; data is preserved. Reversible.
              </p>
            </button>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full px-6 py-3 bg-red-100 text-red-900 border border-red-300 rounded-lg hover:bg-red-200 transition-colors font-semibold text-sm text-left"
            >
              Delete Account Permanently
              <p className="text-xs font-normal text-red-700 mt-1">
                All data will be permanently wiped. Irreversible.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Deactivation
              </h3>
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivatePassword("");
                  setAccountError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Enter your password to deactivate your account. You can
                reactivate it anytime by logging back in.
              </p>
              <input
                type="password"
                value={deactivatePassword}
                onChange={(e) => {
                  setDeactivatePassword(e.target.value);
                  setAccountError("");
                }}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm"
              />
              {accountError && (
                <p className="text-sm text-red-600">{accountError}</p>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivatePassword("");
                  setAccountError("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={accountLoading}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 font-medium text-sm"
              >
                {accountLoading ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Deletion
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setAccountError("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900">
                  ⚠️ This action cannot be undone!
                </p>
                <p className="text-sm text-red-700 mt-2">
                  All your data will be permanently deleted from our servers.
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Enter your password to delete your account permanently.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setAccountError("");
                }}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm"
              />
              {accountError && (
                <p className="text-sm text-red-600">{accountError}</p>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setAccountError("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={accountLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm"
              >
                {accountLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
