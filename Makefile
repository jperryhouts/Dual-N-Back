-include deploy.env

VERSION := $(shell node -p "require('./package.json').version")

allfiles = $(shell find app -type f -not -path '*/\.*' | sed -e 's/app/dist/' )
css = $(shell find app -name '*.css' -not -path '*/\.*' | sed -e 's/app/dist/' )
dirs = $(shell find app -type d -not -path '*/\.*' | sed -e 's/app/dist/' -e 's/$$/\//' )
js = $(shell find app -name '*.js' -not -path '*/\.*' | sed -e 's/app/dist/' )
others = $(shell find app -type f -not -path '*/\.*' | grep -v -e '.js$$' -e '.css$$' | sed -e 's/app/dist/' )

.PHONY: all clean deploy serve serve-local stop test

all: dist

$(dirs): dist/%: app/%
	mkdir -p "$@"
	chmod 775 "$@"

$(js): dist/%: app/%
	@make "$(dir $@)"
	cp "$^" "$@"  # removed terser
	chmod 644 "$@"

$(css): dist/%: app/%
	@make "$(dir $@)"
	cp "$^" "$@"  # removed cssmin
	chmod 644 "$@"

$(others): dist/%: app/% package.json
	@make "$(dir $@)"
	src="$(shell echo $@ | sed -e 's/dist/app/')" ; \
		sed 's/__VERSION__/$(VERSION)/g' "$${src}" > "$@"
	chmod 644 "$@"

clean:
	rm -rf dist

dist/sw.js: $(allfiles)
	npx workbox generateSW workbox-config.js

dist: dist/sw.js

# Use distribution config from ./deploy.env
deploy: dist
	s3cmd sync --no-mime-magic --guess-mime-type --delete-removed dist/ $(S3_BUCKET)
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DIST_ID) --paths '/*'

serve: dist
	docker stop dual-n-back && docker rm dual-n-back || true
	docker run -dit --name dual-n-back -p 8081:80 \
		-v "$(PWD)/dist":/usr/local/apache2/htdocs/ \
		httpd:2.4
	echo "Server started at http://localhost:8081"

serve-local: dist
	python3 -m http.server 8081 -d dist

stop:
	docker stop dual-n-back
	docker rm dual-n-back

test:
	npm test
