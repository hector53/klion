"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  User,
  Palette,
  Bot,
  Bell,
  Database,
  Save,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { usersApi, AIProvider, OpenAIModel } from "@/lib/api";
import { useAISettings } from "@/hooks/use-ai-settings";

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sections: SettingsSection[] = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "security", label: "Seguridad", icon: Lock },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "ai", label: "Inteligencia Artificial", icon: Bot },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "data", label: "Datos", icon: Database },
];

export default function SettingsPage() {
  const toast = useToast();
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState("profile");

  // AI Settings hook
  const {
    settings: aiSettingsFromBackend,
    isLoading: isLoadingAI,
    updateSettings: updateAISettings,
    isSaving: isSavingAI,
    availableModels,
  } = useAISettings();

  // Profile settings
  const [profileSettings, setProfileSettings] = useState({
    name: "",
    email: "",
    company: "",
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "light",
    compactMode: false,
    showTaskIds: true,
  });

  // AI settings (local state)
  const [aiSettings, setAiSettings] = useState({
    defaultProvider: AIProvider.GEMINI,
    openaiDefaultModel: OpenAIModel.GPT_4O_MINI,
    geminiDefaultModel: "gemini-2.5-flash",
    enableSuggestions: true,
    enableAutoSummary: true,
    enableChat: true,
    enableRAG: true,
  });

  // Load AI settings from backend when available
  useEffect(() => {
    if (aiSettingsFromBackend) {
      setAiSettings({
        defaultProvider: aiSettingsFromBackend.defaultProvider,
        openaiDefaultModel: aiSettingsFromBackend.openaiDefaultModel,
        geminiDefaultModel: aiSettingsFromBackend.geminiDefaultModel,
        enableSuggestions: aiSettingsFromBackend.enableSuggestions,
        enableAutoSummary: aiSettingsFromBackend.enableAutoSummary,
        enableChat: aiSettingsFromBackend.enableChat,
        enableRAG: aiSettingsFromBackend.enableRAG,
      });
    }
  }, [aiSettingsFromBackend]);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    taskReminders: true,
    weeklyDigest: false,
  });

  // Password settings
  const [passwordSettings, setPasswordSettings] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveAISettings = () => {
    updateAISettings(aiSettings);
  };

  const handleSave = () => {
    // Aquí iría la lógica para guardar en el backend
    toast.success("Configuración guardada exitosamente");
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Información Personal
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre
            </label>
            <Input
              value={profileSettings.name}
              onChange={(e) =>
                setProfileSettings({ ...profileSettings, name: e.target.value })
              }
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={profileSettings.email}
              onChange={(e) =>
                setProfileSettings({
                  ...profileSettings,
                  email: e.target.value,
                })
              }
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Empresa
            </label>
            <Input
              value={profileSettings.company}
              onChange={(e) =>
                setProfileSettings({
                  ...profileSettings,
                  company: e.target.value,
                })
              }
              placeholder="Nombre de tu empresa"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const handleChangePassword = async () => {
    // Validaciones
    if (
      !passwordSettings.currentPassword ||
      !passwordSettings.newPassword ||
      !passwordSettings.confirmPassword
    ) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }

    if (passwordSettings.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const userId = (session?.user as any)?.id;
    if (!userId) {
      toast.error("No se pudo obtener el usuario");
      return;
    }

    setIsChangingPassword(true);
    try {
      await usersApi.changePassword(
        userId,
        passwordSettings.currentPassword,
        passwordSettings.newPassword,
      );
      toast.success("Contraseña cambiada exitosamente");
      setPasswordSettings({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Error al cambiar la contraseña";
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cambiar Contraseña
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña actual
            </label>
            <Input
              type="password"
              value={passwordSettings.currentPassword}
              onChange={(e) =>
                setPasswordSettings({
                  ...passwordSettings,
                  currentPassword: e.target.value,
                })
              }
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nueva contraseña
            </label>
            <Input
              type="password"
              value={passwordSettings.newPassword}
              onChange={(e) =>
                setPasswordSettings({
                  ...passwordSettings,
                  newPassword: e.target.value,
                })
              }
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mínimo 6 caracteres
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar nueva contraseña
            </label>
            <Input
              type="password"
              value={passwordSettings.confirmPassword}
              onChange={(e) =>
                setPasswordSettings({
                  ...passwordSettings,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="••••••••"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="w-full sm:w-auto"
          >
            {isChangingPassword ? "Cambiando..." : "Cambiar contraseña"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tema
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {["light", "dark", "system"].map((theme) => (
            <button
              key={theme}
              onClick={() =>
                setAppearanceSettings({ ...appearanceSettings, theme })
              }
              className={`p-4 rounded-lg border-2 text-center capitalize transition-colors ${
                appearanceSettings.theme === theme
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:text-gray-300"
              }`}
            >
              {theme === "light"
                ? "Claro"
                : theme === "dark"
                  ? "Oscuro"
                  : "Sistema"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Opciones de Visualización
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={appearanceSettings.compactMode}
              onChange={(e) =>
                setAppearanceSettings({
                  ...appearanceSettings,
                  compactMode: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Modo compacto
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={appearanceSettings.showTaskIds}
              onChange={(e) =>
                setAppearanceSettings({
                  ...appearanceSettings,
                  showTaskIds: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Mostrar IDs de tareas
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderAiSection = () => (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Proveedor de IA
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() =>
              setAiSettings({
                ...aiSettings,
                defaultProvider: AIProvider.GEMINI,
              })
            }
            className={`p-4 rounded-lg border-2 text-center transition-colors ${
              aiSettings.defaultProvider === AIProvider.GEMINI
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:text-gray-300"
            }`}
          >
            <div className="font-semibold">Gemini</div>
            <div className="text-xs mt-1 opacity-75">
              Por Google (Recomendado)
            </div>
          </button>
          <button
            onClick={() =>
              setAiSettings({
                ...aiSettings,
                defaultProvider: AIProvider.OPENAI,
              })
            }
            className={`p-4 rounded-lg border-2 text-center transition-colors ${
              aiSettings.defaultProvider === AIProvider.OPENAI
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:text-gray-300"
            }`}
          >
            <div className="font-semibold">OpenAI</div>
            <div className="text-xs mt-1 opacity-75">GPT-4 y GPT-3.5</div>
          </button>
        </div>
      </div>

      {/* OpenAI Configuration - Only show if OpenAI is selected */}
      {aiSettings.defaultProvider === AIProvider.OPENAI && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Configuración de OpenAI
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              La API key de OpenAI se configura por variable de entorno
              (<code>OPENAI_API_KEY</code>) en el servidor.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modelo por defecto
              </label>
              <select
                value={aiSettings.openaiDefaultModel}
                onChange={(e) =>
                  setAiSettings({
                    ...aiSettings,
                    openaiDefaultModel: e.target.value as OpenAIModel,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Recomendado)</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Gemini Configuration - Only show if Gemini is selected */}
      {aiSettings.defaultProvider === AIProvider.GEMINI && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Configuración de Gemini
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              La API key de Gemini se configura por variable de entorno
              (<code>GEMINI_API_KEY</code>) en el servidor.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modelo por defecto
              </label>
              <select
                value={aiSettings.geminiDefaultModel}
                onChange={(e) =>
                  setAiSettings({
                    ...aiSettings,
                    geminiDefaultModel: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels?.gemini?.length ? (
                  availableModels.gemini.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                ) : (
                  <option value={aiSettings.geminiDefaultModel}>
                    {aiSettings.geminiDefaultModel}
                  </option>
                )}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {availableModels?.gemini?.find(
                  (m) => m.id === aiSettings.geminiDefaultModel,
                )?.description ||
                  "Lista obtenida en vivo de Google — se actualiza sola cuando salen modelos nuevos."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Toggles */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Funciones de IA
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Sugerencias automáticas
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                IA sugiere mejoras en tareas y descripciones
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiSettings.enableSuggestions}
              onChange={(e) =>
                setAiSettings({
                  ...aiSettings,
                  enableSuggestions: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Resúmenes automáticos
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Genera resúmenes de clientes y proyectos
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiSettings.enableAutoSummary}
              onChange={(e) =>
                setAiSettings({
                  ...aiSettings,
                  enableAutoSummary: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Chat IA
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Asistente conversacional con Gemini
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiSettings.enableChat}
              onChange={(e) =>
                setAiSettings({ ...aiSettings, enableChat: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                RAG (Búsqueda en código)
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Búsqueda semántica en repositorios
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiSettings.enableRAG}
              onChange={(e) =>
                setAiSettings({ ...aiSettings, enableRAG: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t dark:border-gray-700">
        <Button
          onClick={handleSaveAISettings}
          disabled={isSavingAI || isLoadingAI}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSavingAI ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Preferencias de Notificación
        </h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Notificaciones por email
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recibir actualizaciones importantes por email
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.emailNotifications}
              onChange={(e) =>
                setNotificationSettings({
                  ...notificationSettings,
                  emailNotifications: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Recordatorios de tareas
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recordatorios para tareas próximas a vencer
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.taskReminders}
              onChange={(e) =>
                setNotificationSettings({
                  ...notificationSettings,
                  taskReminders: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Resumen semanal
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recibir un resumen semanal de actividad
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.weeklyDigest}
              onChange={(e) =>
                setNotificationSettings({
                  ...notificationSettings,
                  weeklyDigest: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
            />
          </label>
        </div>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Exportar Datos
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Descarga todos tus datos en formato JSON para respaldo o migración.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => toast.info("Función en desarrollo")}
          >
            Exportar Tareas
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Función en desarrollo")}
          >
            Exportar Clientes
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Función en desarrollo")}
          >
            Exportar Todo
          </Button>
        </div>
      </div>

      <div className="border-t dark:border-gray-700 pt-6">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Zona de Peligro
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Estas acciones son irreversibles. Por favor, ten cuidado.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() =>
              toast.warning("Esta función requiere confirmación adicional")
            }
          >
            Eliminar todas las tareas completadas
          </Button>
          <Button
            variant="outline"
            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() =>
              toast.warning("Esta función requiere confirmación adicional")
            }
          >
            Eliminar cuenta
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return renderProfileSection();
      case "security":
        return renderSecuritySection();
      case "appearance":
        return renderAppearanceSection();
      case "ai":
        return renderAiSection();
      case "notifications":
        return renderNotificationsSection();
      case "data":
        return renderDataSection();
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 pt-16 lg:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                Configuración
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Personaliza tu experiencia en Klion
              </p>
            </div>
          </div>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Guardar cambios</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar - mobile horizontal scroll, desktop vertical */}
        <nav className="lg:w-64 bg-gray-50 dark:bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-2 lg:p-4 overflow-x-auto lg:overflow-x-visible">
          <ul className="flex lg:flex-col lg:space-y-1 gap-1 lg:gap-0 min-w-max lg:min-w-0">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 lg:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      activeSection === section.id
                        ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    } lg:w-full`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline lg:inline">
                      {section.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 dark:bg-gray-950">
          <Card className="max-w-2xl p-4 lg:p-6">{renderSection()}</Card>
        </main>
      </div>
    </div>
  );
}
