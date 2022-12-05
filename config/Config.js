export default {
  /** Local records limit for rank calculation and plugins */
  localRecordsLimit: 30,
  /** Amount of chat messages stored in runtime memory */
  chatMessagesInRuntime: 300,
  /** Amount of maps in the controller map queue */
  jukeboxQueueSize: 30,
  /** Amount of maps kept in the map history */
  jukeboxHistorySize: 30,
  /** Default amount of maps fetched from the TMX search API */
  defaultTMXSearchLimit: 50,
  /** Privilege levels for each of the administrative actions */
  privileges: {
    ban: 2,
    blacklist: 2,
    mute: 1,
    addGuest: 1
  },
  /** TODO DOCUMENT */
  defaultTimeAttackTimeLimit: 300000,
  /** Relative path (/GameData/Config/) to the blacklist file */
  blacklistFile: "blacklist.txt",
  /** Relative path (/GameData/Config/) to the guestlist file */
  guestlistFile: "guestlist.txt",
  /** Relative path (/GameData/Tracks/) to the matchsettings file */
  matchSettingsFile: "MatchSettings/MatchSettings.txt",
  /** Default message sent as the reason for administrative actions if nothing was specified by the admin */
  defaultReasonMessage: 'No reason specified',
  /** Things that will be interpreted as true for the boolean command parameter */
  truthyParams: ['true', 'yes', 'y', '1'],
  /** Things that will be interpreted as false for the boolean command parameter */
  falsyParams: ['false', 'no', 'n', '0'],
  /** Represents default minimal similarity value at which nickname to
   * login translation will be successful. Used in nickname to login
   * translation in commands. 0.4 is the default value */
  nicknameToLoginSimilarityGoal: 0.4,
  /** Represents minimal similarity difference between best
   * and second-best match at which translation will be successfull.
   * Used in nickname to login translation in commands. 0.15 is default value */
  nicknameToLoginMinimumDifferenceBetweenMatches: 0.15,
  /** Current controller version */
  version: "1.0"
}
