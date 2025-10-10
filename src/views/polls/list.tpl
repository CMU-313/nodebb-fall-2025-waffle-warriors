<!-- IMPORT partials/breadcrumbs.tpl -->

<div data-widget-area="header">
	{{{ each widgets.header }}}
	{{widgets.header.html}}
	{{{ end }}}
</div>

<div class="row">
	<div class="col-lg-9">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1 class="h3">[[polls:title]]</h1>
			{{{ if loggedIn }}}
			<a href="{config.relative_path}/polls/create" class="btn btn-primary">
				<i class="fa fa-plus"></i> [[polls:create]]
			</a>
			{{{ end }}}
		</div>

		{{{ if polls.length }}}
		<div class="polls-list">
			{{{ each polls }}}
			<div class="card mb-3">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-start">
						<div class="flex-grow-1">
							<h5 class="card-title mb-1">
								<a href="{config.relative_path}/polls/{./pollId}" class="text-decoration-none">{./title}</a>
							</h5>

							{{{ if ./description }}}
							<p class="card-text text-muted mb-2">{./description}</p>
							{{{ end }}}

							<div class="d-flex flex-wrap align-items-center gap-3 text-muted small">
								<span><i class="fa fa-user"></i> {./user.username}</span>
								<span><i class="fa fa-clock"></i> <span class="timeago" title="{./timestampISO}">{./timestamp}</span></span>
								<span><i class="fa fa-chart-bar"></i> {./totalVotes} votes</span>
								<span><i class="fa fa-list"></i> {./options.length} options</span>
							</div>
						</div>

						<div class="text-end">
							{{{ if ./status }}}
							<!-- keep it simple: always show a neutral badge -->
							<span class="badge bg-secondary">{./status}</span>
							{{{ end }}}
						</div>
					</div>
				</div>
			</div>
			{{{ end }}}
		</div>

		<!-- IMPORT partials/paginator.tpl -->
		{{{ else }}}
		<div class="alert alert-info">
			<i class="fa fa-info-circle"></i> [[polls:no-polls]]
		</div>
		{{{ end }}}
	</div>

	<div class="col-lg-3">
		<div data-widget-area="sidebar">
			{{{ each widgets.sidebar }}}
			{{widgets.sidebar.html}}
			{{{ end }}}
		</div>
	</div>
</div>

<div data-widget-area="footer">
	{{{ each widgets.footer }}}
	{{widgets.footer.html}}
	{{{ end }}}
</div>

<style>
/* Force a simple vertical list and neutralize any theme "stacked card" visuals */
.polls-list { display: flex; flex-direction: column; gap: 1rem; }
.polls-list .card { position: static !important; float: none !important; width: 100% !important; margin: 0 !important; transform: none !important; }
.polls-list .card::before,
.polls-list .card::after { content: none !important; }
.polls-list .card-body { position: relative; }
</style>
