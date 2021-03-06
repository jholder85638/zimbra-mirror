BDB_ROOT := $(shell pwd)
P4_ROOT ?= $(shell cd $(BDB_ROOT)/../..; pwd)
MAKE ?= make
MAKEARGS ?= -j2

BUILD_PLATFORM ?= $(shell sh $(P4_ROOT)/ZimbraBuild/rpmconf/Build/get_plat_tag.sh)

ifeq ($(BUILD_PLATFORM), )
	BUILD_PLATFORM := "UNKNOWN"
endif

ZIMBRA_HOME ?= /opt/zimbra

ifdef BETA
	include $(BDB_ROOT)/../beta_versions.def
else
	include $(BDB_ROOT)/../versions.def
endif

BDB_TGZ_TARGET	:= $(P4_ROOT)/ThirdPartyBuilds/$(BUILD_PLATFORM)/bdb/bdb-$(BDB_VERSION).tgz

CONFIG_FLAG := --enable-posixmutexes --with-mutex=POSIX/pthreads
LIB_EXT := so

files	:= $(wildcard src/db-$(BDB_VERSION).tar.gz)

all: checksrc allclean build check tar

checksrc:
	$(if $(files), @echo "", exit 1)

check:
	@echo "Verifying bdb build...";
	$(BDB_ROOT)/../zmcheck.pl -b $(ZIMBRA_HOME)/bdb-$(BDB_VERSION)/bin/db_recover
	$(BDB_ROOT)/../zmcheck.pl -l $(ZIMBRA_HOME)/bdb-$(BDB_VERSION)/lib/libdb-5.2.$(LIB_EXT)
build:
	@echo "Building for Platform $(BUILD_PLATFORM)"
	(tar xzf src/db-$(BDB_VERSION).tar.gz; \
	cd db-$(BDB_VERSION); \
	cd build_unix; \
	CFLAGS="-g -O2 -fPIC" LD_RUN_PATH=$(BDB_LIB_DIR) ../dist/configure --prefix=$(ZIMBRA_HOME)/bdb-$(BDB_VERSION) $(CONFIG_FLAG); \
	CFLAGS="-g -O2 -fPIC" LD_RUN_PATH=$(BDB_LIB_DIR) $(MAKE) $(MAKEARGS); \
	LD_RUN_PATH=$(BDB_LIB_DIR) $(MAKE) install)
	(cd $(ZIMBRA_HOME); ln -s bdb-$(BDB_VERSION) bdb)

tar:
	mkdir -p $(P4_ROOT)/ThirdPartyBuilds/$(BUILD_PLATFORM)/bdb
	(cd $(ZIMBRA_HOME); tar czf $(BDB_TGZ_TARGET) bdb-$(BDB_VERSION))
	chmod -R a+w $(BDB_TGZ_TARGET)

clean:
	/bin/rm -rf db-$(BDB_VERSION)

p4edit: $(BDB_TGZ_TARGET)
	p4 add $(BDB_TGZ_TARGET) 
	p4 edit $(BDB_TGZ_TARGET) 

allclean: clean
	/bin/rm -rf $(ZIMBRA_HOME)/bdb-$(BDB_VERSION)
	/bin/rm -rf $(ZIMBRA_HOME)/bdb
	rm -f $(BDB_TGZ_TARGET)
