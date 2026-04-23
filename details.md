on this url.
https://gnop.nebula.gogoro.com/report/gs-statistic/swap-summary/daily?dimension=4&endDate=1776685885&fromDate=1774093885&gsIds&page=1&searchOption=site&siteIds&timeScale=day


i go to network tab, from swap-count

https://gnop.nebula.gogoro.com/api/v1/reports/gs-statistic/swap-count


{
    "reportSetting": {
        "fromDate": 1774030500,
        "endDate": 1776708899,
        "timeScale": "day"
    },
    "series": [
        {
            "swapCount": [
                788,
                1085,
                1047,
                1009,
                1077,
                1068,
                988,
                810,
                1107,
                1116,
                1159,
                1248,
                1274,
                1326,
                1183,
                1313,
                1340,
                1407,
                1097,
                1418,
                1521,
                1228,
                1486,
                1531,
                1064,
                1424,
                1541,
                1808,
                1287,
                1488,
                1448
            ],
            "averageSwapCount": [
                18,
                24,
                23,
                22,
                24,
                24,
                22,
                18,
                25,
                25,
                26,
                28,
                28,
                29,
                26,
                29,
                30,
                31,
                24,
                32,
                34,
                27,
                33,
                34,
                24,
                32,
                34,
                40,
                29,
                33,
                32
            ]
        }
    ]
}

i need to only extract: swapCount.

then from swap-summary:
https://gnop.nebula.gogoro.com/api/v1/reports/gs-statistic/swap-summary

{
    "reportSetting": {
        "fromDate": 1774030500,
        "endDate": 1776708899,
        "timeScale": "day"
    },
    "series": [
        {
            "socBelowNinetyCount": [
                78,
                225,
                175,
                161,
                197,
                153,
                155,
                75,
                234,
                210,
                231,
                271,
                301,
                342,
                244,
                269,
                321,
                371,
                164,
                377,
                503,
                250,
                472,
                426,
                212,
                388,
                516,
                721,
                298,
                428,
                460
            ],
            "socBelowEightyFiveCount": [
                46,
                131,
                79,
                80,
                115,
                83,
                81,
                45,
                124,
                125,
                153,
                164,
                197,
                207,
                168,
                170,
                185,
                235,
                91,
                264,
                336,
                157,
                329,
                277,
                117,
                256,
                365,
                571,
                190,
                278,
                290
            ],
            "socBelowEightyCount": [
                31,
                87,
                55,
                57,
                81,
                59,
                54,
                33,
                94,
                92,
                119,
                108,
                155,
                151,
                125,
                121,
                134,
                168,
                61,
                203,
                246,
                124,
                257,
                214,
                81,
                186,
                292,
                475,
                146,
                192,
                197
            ],
            "totalKm": [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                1.9,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ],
            "totalAh": [
                16317.94,
                21481.39,
                20964.26,
                19540.14,
                21146.96,
                21258.36,
                19802.17,
                16604.72,
                21701.07,
                21789,
                22188.52,
                23407.37,
                24069.49,
                25040.65,
                22178.04,
                25247.48,
                26095,
                26340.8,
                21642.38,
                26788.22,
                28089.47,
                23652.4,
                26824.98,
                28739.62,
                20630.5,
                27448.8,
                28725.38,
                31606.5,
                23456.98,
                27616.99,
                27072.87
            ]
        }
    ]
}

i only need socBelowNinetyCount, socBelowEightyFiveCount, socBelowEightyCount, totalAh.

this was for all total Site. Then i have to indivisually extract for each site name.
[
    {
        "siteId": "530b7nMO",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP4460025070047",
        "siteName": {
            "local": "Bafal Testing centre 2",
            "en-US": "Bafal Testing centre 2"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 5,
        "operationDate": 1753781519,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "sitapaila",
                "en-US": "sitapaila"
            }
        },
        "latitude": 27.70239,
        "longitude": 85.28241,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "updateTime": 1754381054,
        "creator": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "createTime": 1753781754,
        "gsList": [
            {
                "gsId": "XeVEKQML",
                "gsRid": "NP4460025070047A",
                "gsName": "Bafal Testing Centre 2",
                "gsStatus": 203,
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 0,
        "gsSlots": 0,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "4eE2pB3v",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000046",
        "siteName": {
            "local": "Balkhu GoStation",
            "en-US": "Balkhu GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736412569,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Balkhu Chowk, Next to Dakhshin Kali Oil Store",
                "en-US": "Balkhu Chowk, Next to Dakhshin Kali Oil Store"
            }
        },
        "latitude": 27.68365,
        "longitude": 85.29759,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "updateTime": 1739338611,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736412656,
        "gsList": [
            {
                "gsId": "AMx7kD8G",
                "gsRid": "NP446000046A",
                "gsName": "Balkhu Go station",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000039M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "6MyVxPeJ",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000045",
        "siteName": {
            "local": "Swayambhu Pump GoStation",
            "en-US": "Swayambhu Pump GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736331173,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "contactPerson": "supartik ",
        "contactPersonPhone": "9816080404",
        "contactPersonEmail": "supartil.parajuli@nebulanp.com",
        "engineer": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Hama Oil, Swayambhu Pump",
                "en-US": "Hama Oil, Swayambhu Pump"
            }
        },
        "latitude": 27.71533,
        "longitude": 85.28382,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "updateTime": 1755164244,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736331250,
        "gsList": [
            {
                "gsId": "P8pjz6e0",
                "gsRid": "NP446000045A",
                "gsName": "Swayambhu Pump GoStation",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000038M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "d3Dgjoeg",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000044",
        "siteName": {
            "local": "Pepsicola Metro Market GoStation",
            "en-US": "Pepsicola Metro Market GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736330693,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Metro Market, Pepsicola, Kathmandu",
                "en-US": "Metro Market, Pepsicola, Kathmandu"
            }
        },
        "latitude": 27.69258,
        "longitude": 85.36706,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "updateTime": 1739337261,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736330803,
        "gsList": [
            {
                "gsId": "ze7Xr23k",
                "gsRid": "NP446000044A",
                "gsName": "Pepsicola Metro Market GoStation",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000040M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "zMWA6732",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000043",
        "siteName": {
            "local": "Kapan MetroMarket GoStation",
            "en-US": "Kapan MetroMarket GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736329917,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Kapan Metro Market, Kathmandu",
                "en-US": "Kapan Metro Market, Kathmandu"
            }
        },
        "latitude": 27.7327,
        "longitude": 85.36189,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "updateTime": 1749098018,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736329991,
        "gsList": [
            {
                "gsId": "786qQv3g",
                "gsRid": "NP446000043A",
                "gsName": "Kapan Metro Market GoStation",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000042M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "Z3Rv7J3d",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000042",
        "siteName": {
            "local": "Naxal Showroom GoStation",
            "en-US": "Naxal Showroom GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736238786,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "contactPerson": "supartik ",
        "contactPersonPhone": "9816080404",
        "contactPersonEmail": "supartik.parajuli@nebulanp.com",
        "engineer": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Behind BYD showroom ",
                "en-US": "Behind BYD showroom "
            }
        },
        "latitude": 27.71424,
        "longitude": 85.32488,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "updateTime": 1750395430,
        "creator": {
            "id": "k8JBXR8p",
            "code": "42E5CE39",
            "name": "Kamalesh Kumar"
        },
        "createTime": 1736238769,
        "gsList": [
            {
                "gsId": "6My6npeJ",
                "gsRid": "NP446000042A",
                "gsName": "Naxal Showroom Gostation",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000002M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "DeZLw18w",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000041",
        "siteName": {
            "local": "Chyasal Corridor GoStation",
            "en-US": "Chyasal Corridor GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736227293,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Koila Multi Cuisine Restaurant, Dovan Pool, Chyasal, Kathmandu.",
                "en-US": "Koila Multi Cuisine Restaurant, Dovan Pool, Chyasal, Kathmandu."
            }
        },
        "latitude": 27.6789,
        "longitude": 85.33531,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "updateTime": 1749444438,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736227378,
        "gsList": [
            {
                "gsId": "zMkk6zML",
                "gsRid": "NP446000041A",
                "gsName": "Chyasal GoStation",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000008M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "530bjvMO",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000040",
        "siteName": {
            "local": "Ekantakuna Pump GoStation",
            "en-US": "Ekantakuna Pump GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736227188,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-4",
                "name": {
                    "undefined": "lalitpur",
                    "en-US": "lalitpur"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Gayatri Petrol Pump, Ekantakuna Chowk",
                "en-US": "Gayatri Petrol Pump, Ekantakuna Chowk"
            }
        },
        "latitude": 27.66642,
        "longitude": 85.30793,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "updateTime": 1749529848,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736227269,
        "gsList": [
            {
                "gsId": "4eEqPAev",
                "gsRid": "NP446000040A",
                "gsName": "Ekantakuna Pump GoStation",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000041M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "D31gnKMj",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000039",
        "siteName": {
            "local": "Kalimati Pump GoStation",
            "en-US": "Kalimati Pump GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736052109,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Mali Oil Store, Kalimati Chowk.",
                "en-US": "Mali Oil Store, Kalimati Chowk."
            }
        },
        "latitude": 27.69868,
        "longitude": 85.29981,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "updateTime": 1749703464,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736052179,
        "gsList": [
            {
                "gsId": "Z3RE9Eed",
                "gsRid": "NP446000039A",
                "gsName": "Kalimati Pump GoStation ",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000031M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    },
    {
        "siteId": "Y3B7pL8a",
        "company": {
            "id": "6MyzkQeJ",
            "code": "900181",
            "name": "Nebula Energy Pvt. Ltd",
            "country": "NP"
        },
        "siteRid": "NP446000038",
        "siteName": {
            "local": "Banepa Pump GoStation",
            "en-US": "Banepa Pump GoStation"
        },
        "departmentId": "530jgAMO",
        "visible": 1,
        "trial": 0,
        "status": 1,
        "operationDate": 1736052014,
        "availableTime": [
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "monday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "tuesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "wednesday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "thursday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "friday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "saturday"
            },
            {
                "time": [
                    {
                        "from": "00:00",
                        "to": "23:59"
                    }
                ],
                "day": "sunday"
            }
        ],
        "category": {},
        "engineer": {
            "id": "53071OeO",
            "code": "00002",
            "name": "Rohan Joshi"
        },
        "address": {
            "city": {
                "code": "42-0",
                "name": {
                    "undefined": "bagmati",
                    "en-US": "bagmati"
                }
            },
            "district": {
                "code": "42-0-2",
                "name": {
                    "undefined": "kathmandu",
                    "en-US": "kathmandu"
                }
            },
            "zip": "44600",
            "address": {
                "local": "Naryan Oil, Janagal, Banepa, Kavrepalanchowk",
                "en-US": "Naryan Oil, Janagal, Banepa, Kavrepalanchowk"
            }
        },
        "latitude": 27.63217,
        "longitude": 85.50796,
        "photos": [],
        "countOfSitePhotos": 0,
        "vmType": 1,
        "reviser": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "updateTime": 1750929333,
        "creator": {
            "id": "l3rg5Z8r",
            "code": "00001",
            "name": "Supratik Parajuli"
        },
        "createTime": 1736052093,
        "gsList": [
            {
                "gsId": "Y8mNV6MN",
                "gsRid": "NP446000038A",
                "gsName": "Banepa Pump GoStation",
                "gsStatus": 1,
                "hwVersion": "6.0",
                "patchVersion": "PAT_20260401.020423",
                "equipmentCode": "V08WG240910000032M",
                "slotCount": 8,
                "chargerCount": 8,
                "typeA": 1,
                "typeB": 0
            }
        ],
        "gsCount": 1,
        "gsSlots": 8,
        "inverter": 0,
        "operationGroup": {
            "region": {
                "id": "zMv7laev",
                "code": "A52C7576",
                "name": "Operation Department - Region"
            },
            "section": {
                "id": "D31n2R8j",
                "code": "SECTION",
                "name": "Operation Department - Section"
            },
            "division": {
                "id": "530jgAMO",
                "code": "DIVISION",
                "name": "Operation Department"
            }
        }
    }
]

for example for "Naxal Showroom GoStation"
https://gnop.nebula.gogoro.com/report/gs-statistic/swap-summary/daily?_gsList&_siteList=NP446000042%5E%7B%22local%22%3A%22Naxal%20Showroom%20GoStation%22%2C%22en-US%22%3A%22Naxal%20Showroom%20GoStation%22%7D%5EZ3Rv7J3d&dimension=4&endDate=1776685885&fromDate=1774093885&gsIds&page=1&searchOption=site&siteIds&timeScale=day
https://gnop.nebula.gogoro.com/api/v1/reports/gs-statistic/swap-count
{
    "reportSetting": {
        "fromDate": 1774030500,
        "endDate": 1776708899,
        "timeScale": "day"
    },
    "series": [
        {
            "gsId": "6My6npeJ",
            "gsName": {
                "en-US": "Naxal Showroom Gostation"
            },
            "swapCount": [
                17,
                39,
                34,
                29,
                48,
                43,
                39,
                14,
                39,
                31,
                36,
                51,
                41,
                44,
                15,
                50,
                45,
                37,
                36,
                53,
                44,
                31,
                52,
                59,
                27,
                54,
                58,
                72,
                39,
                46,
                48
            ]
        }
    ]
}

similarly for swap memory too.


do you got the context ?