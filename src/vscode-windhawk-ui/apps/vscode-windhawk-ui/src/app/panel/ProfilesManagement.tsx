import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Input,
  List,
  Modal,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import {
  useGetProfiles,
  useCreateProfile,
  useDeleteProfile,
  useRenameProfile,
  useSetActiveProfiles,
  useCaptureConfigToProfile,
  useExportProfile,
  useImportProfile,
} from '../webviewIPC';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

function ProfilesManagement() {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();

  // State
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [activeProfiles, setActiveProfiles] = useState<string[]>([]);
  const [mergeConfigs, setMergeConfigs] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [newProfileName, setNewProfileName] = useState('');
  const [captureCurrentMods, setCaptureCurrentMods] = useState(true);
  const [importData, setImportData] = useState('');

  // Profile hooks
  const { getProfiles } = useGetProfiles(
    useCallback((data) => {
      setProfiles(data.profiles || {});
      setActiveProfiles(data.activeProfiles || []);
      setMergeConfigs(data.mergeConfigs || false);
    }, [])
  );

  const { createProfile } = useCreateProfile(
    useCallback((data) => {
      if (data.succeeded) {
        messageApi.success(t('profiles.created', 'Profile created successfully'));
        getProfiles({});
        setIsCreateModalVisible(false);
        setNewProfileName('');
      } else {
        messageApi.error(t('profiles.createFailed', 'Failed to create profile'));
      }
    }, [messageApi, getProfiles, t])
  );

  const { deleteProfile } = useDeleteProfile(
    useCallback((data) => {
      if (data.succeeded) {
        messageApi.success(t('profiles.deleted', 'Profile deleted successfully'));
        getProfiles({});
      } else {
        messageApi.error(t('profiles.deleteFailed', 'Failed to delete profile'));
      }
    }, [messageApi, getProfiles, t])
  );

  const { renameProfile } = useRenameProfile(
    useCallback((data) => {
      if (data.succeeded) {
        messageApi.success(t('profiles.renamed', 'Profile renamed successfully'));
        getProfiles({});
        setIsRenameModalVisible(false);
        setNewProfileName('');
      } else {
        messageApi.error(t('profiles.renameFailed', 'Failed to rename profile'));
      }
    }, [messageApi, getProfiles, t])
  );

  const { setActiveProfiles: setActiveProfilesAPI } = useSetActiveProfiles(
    useCallback((data) => {
      if (data.succeeded) {
        messageApi.success(t('profiles.activeUpdated', 'Active profiles updated'));
        getProfiles({});
      } else {
        messageApi.error(t('profiles.activeUpdateFailed', 'Failed to update active profiles'));
      }
    }, [messageApi, getProfiles, t])
  );

  const { captureConfigToProfile } = useCaptureConfigToProfile(
    useCallback((data) => {
      if (data.succeeded) {
        messageApi.success(t('profiles.captured', 'Configuration captured to profile'));
        getProfiles({});
      } else {
        messageApi.error(t('profiles.captureFailed', 'Failed to capture configuration'));
      }
    }, [messageApi, getProfiles, t])
  );

  const { exportProfile } = useExportProfile(
    useCallback((data) => {
      if (data.succeeded && data.profile) {
        const dataStr = JSON.stringify(data.profile, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `windhawk-profile-${data.profileId}.json`;
        link.click();
        URL.revokeObjectURL(url);
        messageApi.success(t('profiles.exported', 'Profile exported successfully'));
      } else {
        messageApi.error(t('profiles.exportFailed', 'Failed to export profile'));
      }
    }, [messageApi, t])
  );

  const { importProfile } = useImportProfile(
    useCallback((data) => {
      if (data.succeeded) {
        messageApi.success(t('profiles.imported', 'Profile imported successfully'));
        getProfiles({});
        setIsImportModalVisible(false);
        setImportData('');
      } else {
        messageApi.error(t('profiles.importFailed', 'Failed to import profile'));
      }
    }, [messageApi, getProfiles, t])
  );

  // Load profiles on mount
  useEffect(() => {
    getProfiles({});
  }, [getProfiles]);

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) {
      messageApi.error(t('profiles.nameRequired', 'Profile name is required'));
      return;
    }

    const profileId = Date.now().toString();
    createProfile({
      profileId,
      name: newProfileName.trim(),
      captureCurrentMods,
    });
  };

  const handleRenameProfile = () => {
    if (!newProfileName.trim()) {
      messageApi.error(t('profiles.nameRequired', 'Profile name is required'));
      return;
    }

    renameProfile({
      profileId: selectedProfileId,
      newName: newProfileName.trim(),
    });
  };

  const handleDeleteProfile = (profileId: string) => {
    Modal.confirm({
      title: t('profiles.deleteConfirm', 'Delete Profile'),
      content: t('profiles.deleteMessage', 'Are you sure you want to delete this profile?'),
      onOk: () => {
        deleteProfile({ profileId });
      },
    });
  };

  const handleImportProfile = () => {
    try {
      const profile = JSON.parse(importData);
      const profileId = Date.now().toString();
      importProfile({ profileId, profile });
    } catch (e) {
      messageApi.error(t('profiles.invalidJson', 'Invalid JSON data'));
    }
  };

  const handleMergeConfigsChange = (checked: boolean) => {
    setActiveProfilesAPI({
      profileIds: activeProfiles,
      mergeConfigs: checked,
    });
  };

  const handleProfileActiveChange = (profileId: string, checked: boolean) => {
    let newActiveProfiles;
    if (checked) {
      newActiveProfiles = [...activeProfiles, profileId];
    } else {
      newActiveProfiles = activeProfiles.filter(id => id !== profileId);
    }

    setActiveProfilesAPI({
      profileIds: newActiveProfiles,
      mergeConfigs,
    });
  };

  const getProfileActions = (profileId: string) => [
    {
      key: 'capture',
      label: t('profiles.captureConfig', 'Capture Current Config'),
      onClick: () => {
        captureConfigToProfile({ profileId });
      },
    },
    {
      key: 'rename',
      label: t('profiles.rename', 'Rename'),
      onClick: () => {
        setSelectedProfileId(profileId);
        setNewProfileName(profiles[profileId]?.name || '');
        setIsRenameModalVisible(true);
      },
    },
    {
      key: 'export',
      label: t('profiles.export', 'Export'),
      onClick: () => {
        exportProfile({ profileId });
      },
    },
    {
      key: 'delete',
      label: t('profiles.delete', 'Delete'),
      danger: true,
      onClick: () => {
        handleDeleteProfile(profileId);
      },
    },
  ];

  return (
    <>
      {contextHolder}
      <div style={{ padding: '20px 0' }}>
        <Title level={2}>{t('profiles.title', 'Configuration Profiles')}</Title>
        <Paragraph>
          {t('profiles.description', 'Manage your mod configuration profiles to quickly switch between different setups.')}
        </Paragraph>

        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Title level={4}>{t('profiles.activeTitle', 'Active Profiles')}</Title>
              <Switch
                checked={mergeConfigs}
                onChange={handleMergeConfigsChange}
                checkedChildren={t('profiles.mergeEnabled', 'Merge')}
                unCheckedChildren={t('profiles.mergeDisabled', 'Override')}
              />
              <span style={{ marginLeft: 8 }}>
                {t('profiles.mergeDescription', 'Merge configurations when multiple profiles are active')}
              </span>
            </div>
          </Space>
        </Card>

        <Card
          title={t('profiles.listTitle', 'Available Profiles')}
          extra={
            <Space>
              <Button
                type="primary"
                onClick={() => setIsCreateModalVisible(true)}
              >
                {t('profiles.create', 'Create Profile')}
              </Button>
              <Button onClick={() => setIsImportModalVisible(true)}>
                {t('profiles.import', 'Import Profile')}
              </Button>
            </Space>
          }
        >
          {Object.keys(profiles).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              {t('profiles.empty', 'No profiles created yet. Create your first profile to get started.')}
            </div>
          ) : (
            <List
              dataSource={Object.entries(profiles)}
              renderItem={([profileId, profile]: [string, any]) => (
                <List.Item
                  actions={[
                    <Dropdown
                      key="actions"
                      menu={{ items: getProfileActions(profileId) }}
                      placement="bottomRight"
                    >
                      <Button>
                        {t('profiles.actions', 'Actions')}
                      </Button>
                    </Dropdown>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Checkbox
                        checked={activeProfiles.includes(profileId)}
                        onChange={(e) => handleProfileActiveChange(profileId, e.target.checked)}
                      />
                    }
                    title={profile.name}
                    description={
                      <div>
                        <div>
                          {t('profiles.modCount', 'Mods: {{count}}', { 
                            count: Object.keys(profile.mods || {}).length 
                          })}
                        </div>
                        <div>
                          {t('profiles.created', 'Created: {{date}}', { 
                            date: new Date(profile.created).toLocaleDateString() 
                          })}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Create Profile Modal */}
        <Modal
          title={t('profiles.createTitle', 'Create New Profile')}
          open={isCreateModalVisible}
          onOk={handleCreateProfile}
          onCancel={() => {
            setIsCreateModalVisible(false);
            setNewProfileName('');
          }}
          okText={t('profiles.create', 'Create')}
          cancelText={t('common.cancel', 'Cancel')}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <label>{t('profiles.nameLabel', 'Profile Name')}</label>
              <Input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder={t('profiles.namePlaceholder', 'Enter profile name')}
                style={{ marginTop: 4 }}
              />
            </div>
            <Checkbox
              checked={captureCurrentMods}
              onChange={(e) => setCaptureCurrentMods(e.target.checked)}
            >
              {t('profiles.captureCurrentMods', 'Capture current mod configurations')}
            </Checkbox>
          </Space>
        </Modal>

        {/* Rename Profile Modal */}
        <Modal
          title={t('profiles.renameTitle', 'Rename Profile')}
          open={isRenameModalVisible}
          onOk={handleRenameProfile}
          onCancel={() => {
            setIsRenameModalVisible(false);
            setNewProfileName('');
          }}
          okText={t('profiles.rename', 'Rename')}
          cancelText={t('common.cancel', 'Cancel')}
        >
          <div>
            <label>{t('profiles.nameLabel', 'Profile Name')}</label>
            <Input
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder={t('profiles.namePlaceholder', 'Enter profile name')}
              style={{ marginTop: 4 }}
            />
          </div>
        </Modal>

        {/* Import Profile Modal */}
        <Modal
          title={t('profiles.importTitle', 'Import Profile')}
          open={isImportModalVisible}
          onOk={handleImportProfile}
          onCancel={() => {
            setIsImportModalVisible(false);
            setImportData('');
          }}
          okText={t('profiles.import', 'Import')}
          cancelText={t('common.cancel', 'Cancel')}
          width={600}
        >
          <div>
            <label>{t('profiles.importDataLabel', 'Profile JSON Data')}</label>
            <TextArea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder={t('profiles.importDataPlaceholder', 'Paste exported profile JSON data here')}
              rows={8}
              style={{ marginTop: 4 }}
            />
          </div>
        </Modal>
      </div>
    </>
  );
}

export default ProfilesManagement;