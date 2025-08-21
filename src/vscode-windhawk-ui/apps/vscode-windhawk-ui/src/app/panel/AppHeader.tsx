import {
  faCog,
  faHome,
  faInfo,
  faList,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge, Button, Dropdown, Space } from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { AppUISettingsContext } from '../appUISettings';
import { useGetProfiles, useSetActiveProfiles } from '../webviewIPC';
import logo from './assets/logo-white.svg';

const Header = styled.header`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 20px 20px 0;
  column-gap: 20px;
  margin: 0 auto;
  width: 100%;
  max-width: var(--app-max-width);
`;

const HeaderLogo = styled.div`
  cursor: pointer;
  margin-right: auto;
  font-size: 40px;
  white-space: nowrap;
  font-family: Oxanium;
  user-select: none;
`;

const LogoImage = styled.img`
  height: 80px;
  margin-right: 6px;
`;

const HeaderButtonsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0;
`;

const HeaderIcon = styled(FontAwesomeIcon)`
  margin-right: 8px;
`;

function AppHeader() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const replace = useCallback(
    (to: string) => navigate(to, { replace: true }),
    [navigate]
  );

  const location = useLocation();

  const { updateIsAvailable } = useContext(AppUISettingsContext);

  // Profile state
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [activeProfiles, setActiveProfiles] = useState<string[]>([]);
  const [mergeConfigs, setMergeConfigs] = useState(false);

  // Profile hooks
  const { getProfiles } = useGetProfiles(
    useCallback((data) => {
      setProfiles(data.profiles || {});
      setActiveProfiles(data.activeProfiles || []);
      setMergeConfigs(data.mergeConfigs || false);
    }, [])
  );

  const { setActiveProfiles: setActiveProfilesAPI } = useSetActiveProfiles(
    useCallback((data) => {
      if (data.succeeded) {
        // Refresh profiles after successful change
        getProfiles({});
      }
    }, [getProfiles])
  );

  // Load profiles on mount
  useEffect(() => {
    getProfiles({});
  }, [getProfiles]);

  const buttons = [
    {
      text: t('appHeader.home'),
      route: '/',
      icon: faHome,
    },
    {
      text: t('appHeader.explore'),
      route: '/mods-browser',
      icon: faList,
    },
    {
      text: t('appHeader.settings'),
      route: '/settings',
      icon: faCog,
    },
    {
      text: t('appHeader.about'),
      route: '/about',
      icon: faInfo,
      hasBadge: updateIsAvailable,
    },
  ];

  // Create profile dropdown items
  const profileItems = [
    {
      key: 'none',
      label: t('appHeader.profiles.none', '(none)'),
      onClick: () => {
        setActiveProfilesAPI({ profileIds: [], mergeConfigs });
      },
    },
    ...(Object.keys(profiles).length > 0 ? [{ type: 'divider' as const }] : []),
    ...Object.entries(profiles).map(([profileId, profile]: [string, any]) => ({
      key: profileId,
      label: profile.name,
      onClick: () => {
        setActiveProfilesAPI({ profileIds: [profileId], mergeConfigs });
      },
    })),
    ...(Object.keys(profiles).length > 0 ? [{ type: 'divider' as const }] : []),
    {
      key: 'manage',
      label: t('appHeader.profiles.manage', 'Manage Profiles...'),
      onClick: () => {
        replace('/profiles');
      },
    },
  ];

  const getActiveProfileText = () => {
    if (activeProfiles.length === 0) {
      return t('appHeader.profiles.none', '(none)');
    } else if (activeProfiles.length === 1) {
      const profile = profiles[activeProfiles[0]];
      return profile ? profile.name : activeProfiles[0];
    } else {
      return t('appHeader.profiles.multiple', `${activeProfiles.length} profiles`);
    }
  };

  return (
    <Header>
      <HeaderLogo onClick={() => replace('/')}>
        <LogoImage src={logo} alt="logo" /> Windhawk
      </HeaderLogo>
      <Space>
        <Dropdown menu={{ items: profileItems }} placement="bottomLeft">
          <Button ghost icon={<FontAwesomeIcon icon={faUser} />}>
            <Space>
              {t('appHeader.profiles.label', 'Profile')}: {getActiveProfileText()}
            </Space>
          </Button>
        </Dropdown>
      </Space>
      <HeaderButtonsWrapper>
        {buttons.map(({ text, route, icon, hasBadge }) => (
          <Badge key={route} dot={hasBadge} status="error">
            <Button
              type={location.pathname === route ? 'primary' : 'default'}
              ghost
              onClick={() => replace(route)}
            >
              <HeaderIcon icon={icon} />
              {text}
            </Button>
          </Badge>
        ))}
      </HeaderButtonsWrapper>
    </Header>
  );
}

export default AppHeader;
